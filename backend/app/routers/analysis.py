import json
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
MODEL_NAME = "qwen2.5:7b"


class AnalysisRequest(BaseModel):
    dataset_reference_id: int
    dataset_new_id:       int


def _read_dataset_rows(filepath: str, data_type: str, dataset_role: str) -> list:
    """Baca isi dataset dan kembalikan sebagai list of dict."""
    rows = []
    try:
        if data_type == "tabular":
            import pandas as pd
            df = pd.read_csv(filepath, sep=None, engine="python")
            df.columns = [c.lower().strip() for c in df.columns]

            # Deteksi kolom
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
                    "coding":   str(row.get(coding_col, "")).strip(),
                }
                if analisis_col:
                    entry["analisis"] = str(row.get(analisis_col, "")).strip()
                rows.append(entry)

        elif data_type == "text":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                lines = [l.rstrip("\n") for l in f.readlines() if l.strip()]

            if dataset_role == "llm_reference":
                # Format: verbatim | coding | analisis
                for line in lines:
                    parts = line.split("|")
                    if len(parts) >= 3:
                        rows.append({
                            "verbatim": parts[0].strip(),
                            "coding":   parts[1].strip(),
                            "analisis": parts[2].strip(),
                        })
            elif dataset_role == "llm_new":
                # Format: verbatim | coding
                for line in lines:
                    parts = line.split("|")
                    if len(parts) >= 2:
                        rows.append({
                            "verbatim": parts[0].strip(),
                            "coding":   parts[1].strip(),
                        })
            elif dataset_role == "llm_raw":
                # Format: verbatim saja
                for line in lines:
                    rows.append({"verbatim": line.strip()})

    except Exception as e:
        print(f"Error membaca dataset: {e}")

    return rows


def _build_prompt(reference_rows: list, new_rows: list, dataset_role: str) -> str:
    """Bangun prompt few-shot untuk Ollama."""

    # Ambil max 3 baris referensi
    examples = reference_rows[:3]

    prompt = """Kamu adalah psikolog klinis profesional yang berpengalaman dalam analisis kualitatif.
Tugasmu adalah membuat analisis psikologis berdasarkan verbatim wawancara dan coding temanya.
Tulis analisis dalam Bahasa Indonesia yang formal dan akademis.

Berikut contoh analisis yang sudah ada sebagai referensi gaya penulisan:\n\n"""

    for i, ex in enumerate(examples, 1):
        prompt += f"CONTOH {i}:\n"
        prompt += f"Verbatim : {ex.get('verbatim', '')}\n"
        prompt += f"Coding   : {ex.get('coding', '')}\n"
        prompt += f"Analisis : {ex.get('analisis', '')}\n\n"

    prompt += "─" * 50 + "\n\n"

    if dataset_role == "llm_raw":
        prompt += "Sekarang buatkan CODING dan ANALISIS untuk setiap segmen berikut:\n\n"
        for i, row in enumerate(new_rows, 1):
            prompt += f"SEGMEN {i}:\n"
            prompt += f"Verbatim : {row.get('verbatim', '')}\n\n"

        prompt += "Berikan output dalam format berikut untuk SETIAP segmen:\n"
        prompt += "SEGMEN 1:\nCODING: [coding]\nANALISIS: [analisis]\n\n"
        prompt += "SEGMEN 2:\nCODING: [coding]\nANALISIS: [analisis]\n\n"
        prompt += "Dan seterusnya...\n"

    else:
        prompt += "Sekarang buatkan ANALISIS untuk setiap segmen berikut:\n\n"
        for i, row in enumerate(new_rows, 1):
            prompt += f"SEGMEN {i}:\n"
            prompt += f"Verbatim : {row.get('verbatim', '')}\n"
            prompt += f"Coding   : {row.get('coding', '')}\n\n"

        prompt += "Berikan output dalam format berikut untuk SETIAP segmen:\n"
        prompt += "SEGMEN 1:\nANALISIS: [analisis]\n\n"
        prompt += "SEGMEN 2:\nANALISIS: [analisis]\n\n"
        prompt += "Dan seterusnya...\n"

    return prompt


def _parse_output(raw_output: str, new_rows: list, dataset_role: str) -> list:
    """Parse output Ollama menjadi list of dict per segmen."""
    results = []
    segments = raw_output.split("SEGMEN ")

    for i, row in enumerate(new_rows):
        result = {
            "verbatim": row.get("verbatim", ""),
            "coding":   row.get("coding", ""),
            "analisis": "",
        }

        # Cari segmen yang sesuai
        seg_text = ""
        for seg in segments:
            if seg.startswith(f"{i + 1}:") or seg.startswith(f"{i + 1}\n"):
                seg_text = seg
                break

        if seg_text:
            lines = seg_text.split("\n")
            for line in lines:
                if line.startswith("ANALISIS:"):
                    result["analisis"] = line.replace("ANALISIS:", "").strip()
                elif line.startswith("CODING:") and dataset_role == "llm_raw":
                    result["coding"] = line.replace("CODING:", "").strip()

        results.append(result)

    return results


async def _run_analysis(db: Session, analysis_id: int):
    """Background task — kirim prompt ke Ollama dan simpan hasil."""
    analysis = db.query(LLMAnalysis).filter(
        LLMAnalysis.id == analysis_id).first()
    if not analysis:
        return

    try:
        analysis.status = "running"
        db.commit()

        # Ambil dataset
        ref_dataset = db.query(Dataset).filter(
            Dataset.id == analysis.dataset_reference_id).first()
        new_dataset = db.query(Dataset).filter(
            Dataset.id == analysis.dataset_new_id).first()

        if not ref_dataset or not new_dataset:
            raise Exception("Dataset tidak ditemukan")

        # Baca isi dataset
        ref_rows = _read_dataset_rows(
            ref_dataset.filepath, ref_dataset.data_type, "llm_reference")
        new_rows = _read_dataset_rows(
            new_dataset.filepath,  new_dataset.data_type,  new_dataset.dataset_role)

        if not ref_rows:
            raise Exception(
                "Dataset referensi tidak dapat dibaca atau formatnya salah")
        if not new_rows:
            raise Exception(
                "Dataset baru tidak dapat dibaca atau formatnya salah")

        # Build prompt
        prompt = _build_prompt(ref_rows, new_rows, new_dataset.dataset_role)

        # Kirim ke Ollama
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(OLLAMA_URL, json={
                "model":  MODEL_NAME,
                "prompt": prompt,
                "stream": False,
            })
            result_json = response.json()
            raw_output = result_json.get("response", "")

        # Parse output
        results = _parse_output(raw_output, new_rows, new_dataset.dataset_role)

        analysis.results = json.dumps(results, ensure_ascii=False)
        analysis.status = "completed"
        analysis.error_message = None

    except Exception as e:
        analysis.status = "failed"
        analysis.error_message = str(e)

    finally:
        db.commit()


@router.post("/generate")
async def generate_analysis(
    payload:          AnalysisRequest,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User = Depends(require_role("data_scientist")),
):
    """Mulai proses analisis LLM."""
    # Validasi dataset referensi
    ref_dataset = db.query(Dataset).filter(
        Dataset.id == payload.dataset_reference_id).first()
    if not ref_dataset:
        raise HTTPException(
            status_code=404, detail="Dataset referensi tidak ditemukan")
    if ref_dataset.dataset_role != "llm_reference":
        raise HTTPException(
            status_code=400, detail="Dataset referensi harus bertipe llm_reference")

    # Validasi dataset baru
    new_dataset = db.query(Dataset).filter(
        Dataset.id == payload.dataset_new_id).first()
    if not new_dataset:
        raise HTTPException(
            status_code=404, detail="Dataset baru tidak ditemukan")
    if new_dataset.dataset_role not in ("llm_new", "llm_raw"):
        raise HTTPException(
            status_code=400, detail="Dataset baru harus bertipe llm_new atau llm_raw")

    # Cek status dataset
    if new_dataset.status == "locked":
        raise HTTPException(
            status_code=403, detail="Dataset baru terkunci karena consent tidak disetujui")

    # Buat record analisis
    analysis = LLMAnalysis(
        dataset_reference_id=payload.dataset_reference_id,
        dataset_new_id=payload.dataset_new_id,
        created_by=current_user.id,
        status="pending",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Jalankan di background
    background_tasks.add_task(_run_analysis, db, analysis.id)

    return {
        "status": "success",
        "message": "Analisis dimulai. Proses berjalan di background.",
        "data": {
            "analysis_id": analysis.id,
            "status":      analysis.status,
        }
    }


@router.get("")
def list_analyses(
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List semua analisis."""
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
            "status":                 a.status,
            "error_message":          a.error_message,
            "created_at":             str(a.created_at),
            "total_results":          len(json.loads(a.results or "[]")),
        })

    return {"status": "success", "data": result}


@router.get("/{analysis_id}")
def get_analysis(
    analysis_id:  int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detail hasil analisis."""
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
            "status":                 analysis.status,
            "error_message":          analysis.error_message,
            "created_at":             str(analysis.created_at),
            "results":                json.loads(analysis.results or "[]"),
        }
    }


@router.get("/{analysis_id}/status")
def get_analysis_status(
    analysis_id:  int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Polling status analisis."""
    analysis = db.query(LLMAnalysis).filter(
        LLMAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan")

    return {
        "status": "success",
        "data": {
            "analysis_id":   analysis.id,
            "status":        analysis.status,
            "error_message": analysis.error_message,
            "total_results": len(json.loads(analysis.results or "[]")),
        }
    }
