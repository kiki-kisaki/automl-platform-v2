import json
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.llm_analysis import LLMAnalysis

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_TAGS = "http://localhost:11434/api/tags"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_available_models() -> list:
    """Ambil daftar model yang terinstall di Ollama."""
    try:
        import httpx as hx
        res = hx.get(OLLAMA_TAGS, timeout=5.0)
        models = res.json().get("models", [])
        return [m["name"] for m in models]
    except Exception:
        return ["qwen2.5:7b"]


def _read_dataset_rows(filepath: str, data_type: str, dataset_role: str) -> list:
    rows = []
    try:
        if data_type == "tabular":
            import pandas as pd
            df = pd.read_csv(filepath, sep=None, engine="python")
            df.columns = [c.lower().strip() for c in df.columns]

            verbatim_col = next(
                (c for c in df.columns if "verbatim" in c), None)
            coding_col = next((c for c in df.columns if "coding" in c), None)
            analisis_col = next(
                (c for c in df.columns if "analisis" in c or "analysis" in c), None)

            if not verbatim_col or not coding_col:
                return []

            for _, row in df.iterrows():
                entry = {
                    "verbatim": str(row.get(verbatim_col, "")).strip(),
                    "coding":   str(row.get(coding_col,   "")).strip(),
                }
                if analisis_col:
                    entry["analisis"] = str(row.get(analisis_col, "")).strip()
                rows.append(entry)

        elif data_type == "text":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                lines = [l.rstrip("\n") for l in f.readlines() if l.strip()]

            if dataset_role == "llm_reference":
                for line in lines:
                    parts = line.split("|")
                    if len(parts) >= 3:
                        rows.append({
                            "verbatim": parts[0].strip(),
                            "coding":   parts[1].strip(),
                            "analisis": parts[2].strip(),
                        })
            elif dataset_role == "llm_new":
                for line in lines:
                    parts = line.split("|")
                    if len(parts) >= 2:
                        rows.append({
                            "verbatim": parts[0].strip(),
                            "coding":   parts[1].strip(),
                        })
            elif dataset_role == "llm_raw":
                for line in lines:
                    rows.append({"verbatim": line.strip()})

    except Exception as e:
        print(f"Error membaca dataset: {e}")

    return rows


def _build_prompt(reference_rows: list, new_rows: list, dataset_role: str) -> str:
    examples = reference_rows[:3]
    prompt = """Kamu adalah psikolog klinis profesional yang berpengalaman dalam analisis kualitatif.
Tugasmu adalah membuat analisis psikologis berdasarkan verbatim wawancara dan coding temanya.
Tulis analisis dalam Bahasa Indonesia yang formal dan akademis.\n\n"""

    prompt += "Berikut contoh analisis yang sudah ada sebagai referensi gaya penulisan:\n\n"
    for i, ex in enumerate(examples, 1):
        prompt += f"CONTOH {i}:\n"
        prompt += f"Verbatim : {ex.get('verbatim', '')}\n"
        prompt += f"Coding   : {ex.get('coding',   '')}\n"
        prompt += f"Analisis : {ex.get('analisis', '')}\n\n"

    prompt += "─" * 50 + "\n\n"

    if dataset_role == "llm_raw":
        prompt += "Sekarang buatkan CODING dan ANALISIS untuk setiap segmen berikut:\n\n"
        for i, row in enumerate(new_rows, 1):
            prompt += f"SEGMEN {i}:\nVerbatim : {row.get('verbatim', '')}\n\n"
        prompt += "Format output:\nSEGMEN 1:\nCODING: [coding]\nANALISIS: [analisis]\n\n"
    else:
        prompt += "Sekarang buatkan ANALISIS untuk setiap segmen berikut:\n\n"
        for i, row in enumerate(new_rows, 1):
            prompt += f"SEGMEN {i}:\nVerbatim : {row.get('verbatim', '')}\nCoding   : {row.get('coding', '')}\n\n"
        prompt += "Format output:\nSEGMEN 1:\nANALISIS: [analisis]\n\nSEGMEN 2:\nANALISIS: [analisis]\n"

    return prompt


def _parse_output(raw_output: str, new_rows: list, dataset_role: str) -> list:
    results = []
    segments = raw_output.split("SEGMEN ")

    for i, row in enumerate(new_rows):
        result = {
            "verbatim": row.get("verbatim", ""),
            "coding":   row.get("coding",   ""),
            "analisis": "",
        }
        seg_text = ""
        for seg in segments:
            if seg.startswith(f"{i + 1}:") or seg.startswith(f"{i + 1}\n"):
                seg_text = seg
                break

        if seg_text:
            for line in seg_text.split("\n"):
                if line.startswith("ANALISIS:"):
                    result["analisis"] = line.replace("ANALISIS:", "").strip()
                elif line.startswith("CODING:") and dataset_role == "llm_raw":
                    result["coding"] = line.replace("CODING:", "").strip()

        results.append(result)

    return results


def _calculate_rouge(results: list, reference_rows: list) -> dict:
    """Hitung ROUGE score hasil generate vs analisis referensi."""
    try:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(
            ["rouge1", "rouge2", "rougeL"], use_stemmer=False)

        ref_texts = [r.get("analisis", "")
                     for r in reference_rows if r.get("analisis")]
        hyp_texts = [r.get("analisis", "")
                     for r in results if r.get("analisis")]

        if not ref_texts or not hyp_texts:
            return {}

        # Gabungkan semua teks untuk scoring global
        ref_combined = " ".join(ref_texts)
        hyp_combined = " ".join(hyp_texts)

        scores = scorer.score(ref_combined, hyp_combined)
        return {
            "rouge1": round(scores["rouge1"].fmeasure, 4),
            "rouge2": round(scores["rouge2"].fmeasure, 4),
            "rougeL": round(scores["rougeL"].fmeasure, 4),
        }
    except Exception as e:
        print(f"Error hitung ROUGE: {e}")
        return {}


def _calculate_avg_length(results: list) -> float:
    """Hitung rata-rata panjang analisis dalam kata."""
    texts = [r.get("analisis", "") for r in results if r.get("analisis")]
    if not texts:
        return 0.0
    return round(sum(len(t.split()) for t in texts) / len(texts), 2)


async def _run_analysis(db, analysis_id: int):
    """Background task — generate analisis dan hitung metrik."""
    analysis = db.query(LLMAnalysis).filter(
        LLMAnalysis.id == analysis_id).first()
    if not analysis:
        return

    try:
        analysis.status = "running"
        db.commit()

        ref_dataset = db.query(Dataset).filter(
            Dataset.id == analysis.dataset_reference_id).first()
        new_dataset = db.query(Dataset).filter(
            Dataset.id == analysis.dataset_new_id).first()

        if not ref_dataset or not new_dataset:
            raise Exception("Dataset tidak ditemukan")

        ref_rows = _read_dataset_rows(
            ref_dataset.filepath, ref_dataset.data_type, "llm_reference")
        new_rows = _read_dataset_rows(
            new_dataset.filepath, new_dataset.data_type, new_dataset.dataset_role)

        if not ref_rows:
            raise Exception("Dataset referensi tidak dapat dibaca")
        if not new_rows:
            raise Exception("Dataset baru tidak dapat dibaca")

        prompt = _build_prompt(ref_rows, new_rows, new_dataset.dataset_role)

        # Generate + hitung waktu
        start_time = time.time()
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(OLLAMA_URL, json={
                "model":  analysis.model_name,
                "prompt": prompt,
                "stream": False,
            })
            result_json = response.json()
            raw_output = result_json.get("response", "")
        end_time = time.time()

        generate_time = round(end_time - start_time, 2)

        # Parse output
        results = _parse_output(raw_output, new_rows, new_dataset.dataset_role)

        # Hitung metrik
        rouge_scores = _calculate_rouge(results, ref_rows)
        avg_length = _calculate_avg_length(results)

        analysis.results = json.dumps(results, ensure_ascii=False)
        analysis.rouge_scores = json.dumps(rouge_scores)
        analysis.generate_time = generate_time
        analysis.avg_length = avg_length
        analysis.status = "completed"
        analysis.error_message = None

    except Exception as e:
        analysis.status = "failed"
        analysis.error_message = str(e)

    finally:
        db.commit()


# ── Schemas ────────────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    dataset_reference_id: int
    dataset_new_id:       int
    model_name:           str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/models")
def get_models(current_user: User = Depends(get_current_user)):
    """Ambil daftar model Ollama yang tersedia."""
    models = _get_available_models()
    return {"status": "success", "data": models}


@router.post("/generate")
async def generate_analysis(
    payload:          AnalysisRequest,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User = Depends(require_role("data_scientist")),
):
    ref_dataset = db.query(Dataset).filter(
        Dataset.id == payload.dataset_reference_id).first()
    if not ref_dataset:
        raise HTTPException(
            status_code=404, detail="Dataset referensi tidak ditemukan")
    if ref_dataset.dataset_role != "llm_reference":
        raise HTTPException(
            status_code=400, detail="Dataset referensi harus bertipe llm_reference")

    new_dataset = db.query(Dataset).filter(
        Dataset.id == payload.dataset_new_id).first()
    if not new_dataset:
        raise HTTPException(
            status_code=404, detail="Dataset baru tidak ditemukan")
    if new_dataset.dataset_role not in ("llm_new", "llm_raw"):
        raise HTTPException(
            status_code=400, detail="Dataset baru harus bertipe llm_new atau llm_raw")
    if new_dataset.status == "locked":
        raise HTTPException(
            status_code=403, detail="Dataset baru terkunci karena consent tidak disetujui")

    # Validasi model tersedia
    available = _get_available_models()
    if payload.model_name not in available:
        raise HTTPException(
            status_code=400, detail=f"Model '{payload.model_name}' tidak tersedia di Ollama")

    analysis = LLMAnalysis(
        dataset_reference_id=payload.dataset_reference_id,
        dataset_new_id=payload.dataset_new_id,
        created_by=current_user.id,
        model_name=payload.model_name,
        status="pending",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    background_tasks.add_task(_run_analysis, db, analysis.id)

    return {
        "status": "success",
        "message": f"Analisis dimulai dengan model {payload.model_name}",
        "data": {
            "analysis_id": analysis.id,
            "model_name":  analysis.model_name,
            "status":      analysis.status,
        }
    }


@router.get("")
def list_analyses(
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analyses = db.query(LLMAnalysis).order_by(LLMAnalysis.id.desc()).all()
    result = []
    for a in analyses:
        ref = db.query(Dataset).filter(
            Dataset.id == a.dataset_reference_id).first()
        new = db.query(Dataset).filter(Dataset.id == a.dataset_new_id).first()
        result.append({
            "analysis_id":            a.id,
            "dataset_reference_name": ref.name if ref else "-",
            "dataset_new_name":       new.name if new else "-",
            "model_name":             a.model_name or "qwen2.5:7b",
            "status":                 a.status,
            "error_message":          a.error_message,
            "created_at":             str(a.created_at),
            "total_results":          len(json.loads(a.results or "[]")),
            "rouge_scores":           json.loads(a.rouge_scores or "{}"),
            "generate_time":          a.generate_time or 0,
            "avg_length":             a.avg_length or 0,
        })
    return {"status": "success", "data": result}


@router.get("/{analysis_id}")
def get_analysis(
    analysis_id:  int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(LLMAnalysis).filter(
        LLMAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan")

    ref = db.query(Dataset).filter(
        Dataset.id == analysis.dataset_reference_id).first()
    new = db.query(Dataset).filter(
        Dataset.id == analysis.dataset_new_id).first()

    return {
        "status": "success",
        "data": {
            "analysis_id":            analysis.id,
            "dataset_reference_name": ref.name if ref else "-",
            "dataset_new_name":       new.name if new else "-",
            "dataset_role":           new.dataset_role if new else "-",
            "model_name":             analysis.model_name or "qwen2.5:7b",
            "status":                 analysis.status,
            "error_message":          analysis.error_message,
            "created_at":             str(analysis.created_at),
            "rouge_scores":           json.loads(analysis.rouge_scores or "{}"),
            "generate_time":          analysis.generate_time or 0,
            "avg_length":             analysis.avg_length or 0,
            "results":                json.loads(analysis.results or "[]"),
        }
    }


@router.get("/{analysis_id}/status")
def get_analysis_status(
    analysis_id:  int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(LLMAnalysis).filter(
        LLMAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan")

    return {
        "status": "success",
        "data": {
            "analysis_id":   analysis.id,
            "model_name":    analysis.model_name,
            "status":        analysis.status,
            "error_message": analysis.error_message,
            "total_results": len(json.loads(analysis.results or "[]")),
        }
    }
