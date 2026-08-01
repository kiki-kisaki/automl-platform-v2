import os
import sys
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.experiment import Experiment
from app.models.preprocessing import Preprocessing
from app.models.dataset import Dataset
from app.database import SessionLocal
from app.config import MODEL_DIR, ML_SERVICE_PATH
from app.schemas.experiment import ALGORITHMS


def create_experiment(
    db: Session, user_id: int, payload
) -> Experiment:
    prep = db.query(Preprocessing).filter(
        Preprocessing.id == payload.preprocessing_id
    ).first()
    if not prep:
        raise HTTPException(
            status_code=404, detail="Preprocessing tidak ditemukan")

    if prep.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Preprocessing status '{prep.status}' — hanya yang 'completed' yang bisa ditraining"
        )

    dataset = db.query(Dataset).filter(Dataset.id == prep.dataset_id).first()
    data_type = dataset.data_type

    # Tentukan task_type
    task_type = payload.task_type
    if data_type in ("image", "text"):
        task_type = "classification"  # image dan text selalu classification
    elif not task_type:
        raise HTTPException(
            status_code=400, detail="task_type wajib diisi untuk dataset tabular")

    # Validasi algoritma
    allowed = ALGORITHMS.get(data_type, {}).get(task_type, [])
    if payload.algorithm not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Algoritma '{payload.algorithm}' tidak valid untuk {data_type}/{task_type}. "
            f"Pilihan: {allowed}"
        )

    exp = Experiment(
        preprocessing_id=payload.preprocessing_id,
        dataset_id=dataset.id,
        created_by=user_id,
        name=payload.name,
        data_type=data_type,
        task_type=task_type,
        algorithm=payload.algorithm,
        hyperparameters=payload.hyperparameters or {},
        status="queued",
        progress=0,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


def run_training_job(experiment_id: int):
    """Dipanggil BackgroundTasks."""
    if ML_SERVICE_PATH not in sys.path:
        sys.path.insert(0, ML_SERVICE_PATH)

    db = SessionLocal()
    try:
        exp = db.query(Experiment).filter(
            Experiment.id == experiment_id).first()
        if not exp:
            return

        prep = db.query(Preprocessing).filter(
            Preprocessing.id == exp.preprocessing_id
        ).first()

        # Status: queued → running
        exp.status = "running"
        exp.progress = 10
        db.commit()

        import time
        time.sleep(0.5)

        exp.progress = 25
        db.commit()

        os.makedirs(MODEL_DIR, exist_ok=True)
        model_save_path = os.path.join(MODEL_DIR, f"exp_{experiment_id}.pkl")

        exp.progress = 40
        db.commit()

        config = {
            "preprocessed_path": prep.output_path,
            "data_type":         exp.data_type,
            "task_type":         exp.task_type,
            "algorithm":         exp.algorithm,
            "hyperparameters":   exp.hyperparameters or {},
            "model_save_path":   model_save_path,
        }

        exp.progress = 55
        db.commit()

        from training.pipeline import run_training
        result = run_training(config)

        exp.progress = 90
        db.commit()

        if not result or result.get("status") != "completed":
            exp.status = "failed"
            exp.error_message = (result or {}).get("error", "Training gagal")
        else:
            exp.status = "completed"
            exp.progress = 100
            exp.metrics = result.get("metrics")
            exp.model_path = result.get("model_path")

        db.commit()

    except Exception as e:
        exp = db.query(Experiment).filter(
            Experiment.id == experiment_id).first()
        if exp:
            exp.status = "failed"
            exp.error_message = str(e)
            db.commit()
    finally:
        db.close()


def get_experiments(db: Session, data_type: str = None):
    query = db.query(Experiment)
    if data_type:
        query = query.filter(Experiment.data_type == data_type)
    return query.order_by(Experiment.id.desc()).all()


def get_experiment_by_id(db: Session, exp_id: int) -> Experiment:
    exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(
            status_code=404, detail="Eksperimen tidak ditemukan")
    return exp
