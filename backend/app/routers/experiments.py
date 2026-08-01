from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.schemas.experiment import ExperimentRequest
from app.services.experiment_service import (
    create_experiment, run_training_job,
    get_experiments, get_experiment_by_id,
)

router = APIRouter()


@router.post("", status_code=201)
def start_experiment(
    payload:          ExperimentRequest,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User = Depends(require_role("ml_engineer")),
):
    exp = create_experiment(db, current_user.id, payload)
    background_tasks.add_task(run_training_job, exp.id)
    return {
        "status":  "success",
        "message": "Training dimulai",
        "data": {
            "experiment_id": exp.id,
            "name":          exp.name,
            "status":        exp.status,
        }
    }


@router.get("")
def list_experiments(
    data_type:    Optional[str] = None,
    db:           Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ml_engineer", "viewer", "admin")),
):
    exps = get_experiments(db, data_type)
    return {
        "status": "success",
        "data": [
            {
                "experiment_id":    e.id,
                "name":             e.name,
                "data_type":        e.data_type,
                "task_type":        e.task_type,
                "algorithm":        e.algorithm,
                "status":           e.status,
                "progress":         e.progress,
                "preprocessing_id": e.preprocessing_id,
                "dataset_id":       e.dataset_id,
            }
            for e in exps
        ]
    }


@router.get("/{exp_id}/status")
def get_status(
    exp_id:       int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    e = get_experiment_by_id(db, exp_id)
    return {
        "status": "success",
        "data": {
            "experiment_id": e.id,
            "name":          e.name,
            "status":        e.status,
            "progress":      e.progress,
            "error_message": e.error_message,
            "metrics":       e.metrics,
            "data_type":     e.data_type,
            "task_type":     e.task_type,
            "algorithm":     e.algorithm,
        }
    }


@router.get("/{exp_id}/result")
def get_result(
    exp_id:       int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ml_engineer", "viewer", "admin")),
):
    e = get_experiment_by_id(db, exp_id)
    if e.status != "completed":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Training belum selesai. Status saat ini: '{e.status}'"
        )
    return {
        "status": "success",
        "data": {
            "experiment_id": e.id,
            "name":          e.name,
            "data_type":     e.data_type,
            "task_type":     e.task_type,
            "algorithm":     e.algorithm,
            "metrics":       e.metrics,
            "model_path":    e.model_path,
        }
    }


@router.get("/{exp_id}/model/download")
def download_model(
    exp_id:       int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(
        require_role("viewer", "ml_engineer", "admin")),
):
    e = get_experiment_by_id(db, exp_id)
    if e.status != "completed":
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Model belum tersedia")
    if not e.model_path or not os.path.exists(e.model_path):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404, detail="File model tidak ditemukan di server")
    return FileResponse(
        path=e.model_path,
        filename=f"{e.name}.pkl",
        media_type="application/octet-stream",
    )
