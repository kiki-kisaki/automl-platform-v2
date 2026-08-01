from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.schemas.preprocessing import PreprocessRequest
from app.services.preprocessing_service import (
    create_preprocessing_job, run_preprocessing_job,
    get_preprocessings, get_preprocessing_by_id,
)

router = APIRouter()


@router.post("", status_code=201)
def start_preprocessing(
    payload:          PreprocessRequest,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User = Depends(require_role("data_scientist")),
):
    prep = create_preprocessing_job(
        db, current_user.id,
        payload.dataset_id,
        payload.config_type,
        payload.name,
        payload.config,
    )
    background_tasks.add_task(run_preprocessing_job, prep.id)
    return {
        "status":  "success",
        "message": "Preprocessing dimulai",
        "data": {
            "preprocessing_id": prep.id,
            "dataset_id":       prep.dataset_id,
            "status":           prep.status,
        }
    }


@router.get("")
def list_preprocessings(
    dataset_id:   Optional[int] = None,
    db:           Session = Depends(get_db),
    current_user: User = Depends(
        require_role("data_scientist", "ml_engineer")),
):
    preps = get_preprocessings(db, dataset_id)
    return {
        "status": "success",
        "data": [
            {
                "preprocessing_id": p.id,
                "name":             p.name or f"Preprocessing #{p.id}",
                "dataset_id":       p.dataset_id,
                "processed_by":     p.processed_by,
                "config":           p.config,
                "status":           p.status,
                "output_path":      p.output_path,
                "error_message":    p.error_message,
                "is_trained":       p.is_trained if hasattr(p, "is_trained") else 0,
            }
            for p in preps
        ]
    }


@router.get("/{prep_id}")
def get_preprocessing(
    prep_id:      int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = get_preprocessing_by_id(db, prep_id)
    return {
        "status": "success",
        "data": {
            "preprocessing_id": p.id,
            "name":             p.name or f"Preprocessing #{p.id}",
            "dataset_id":       p.dataset_id,
            "processed_by":     p.processed_by,
            "config":           p.config,
            "status":           p.status,
            "output_path":      p.output_path,
            "error_message":    p.error_message,
        }
    }


@router.patch("/{prep_id}/toggle-trained")
def toggle_trained(
    prep_id:      int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(require_role("ml_engineer")),
):
    """Toggle status is_trained preprocessing."""
    from app.models.preprocessing import Preprocessing
    prep = db.query(Preprocessing).filter(Preprocessing.id == prep_id).first()
    if not prep:
        raise HTTPException(
            status_code=404, detail="Preprocessing tidak ditemukan")

    prep.is_trained = 0 if prep.is_trained else 1
    db.commit()
    db.refresh(prep)
    return {
        "status":  "success",
        "message": f"Status diubah ke '{'sudah' if prep.is_trained else 'belum'} di-training'",
        "data": {
            "preprocessing_id": prep.id,
            "is_trained":       prep.is_trained,
        }
    }
