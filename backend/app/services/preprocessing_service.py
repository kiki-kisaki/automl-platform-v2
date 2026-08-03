import os
import sys
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException, BackgroundTasks

from app.models.dataset import Dataset
from app.models.preprocessing import Preprocessing
from app.database import SessionLocal
from app.config import PREPROCESSED_DIR, ML_SERVICE_PATH
from app.schemas import dataset


def _get_dataset(db: Session, dataset_id: int) -> Dataset:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")
    return dataset


def create_preprocessing_job(
    db: Session, user_id: int, dataset_id: int,
    config_type: str, name: str, config: dict
) -> Preprocessing:
    dataset = _get_dataset(db, dataset_id)
    # Cek privacy consent dataset locked tidak bisa diproses
    if dataset.status == "locked":
        raise HTTPException(
            status_code=403,
            detail="Dataset tidak dapat diproses karena ada subjek yang tidak menyetujui pemrosesan data."
        )

    if dataset.status != "uploaded":
        raise HTTPException(
            status_code=400,
            detail=f"Dataset status '{dataset.status}' — hanya dataset dengan status 'uploaded' yang bisa diproses"
        )

    if config_type == "image":
        extra_ids = config.get("extra_dataset_ids", [])
        for extra_id in extra_ids:
            extra = _get_dataset(db, extra_id)
            if extra.data_type != "image":
                raise HTTPException(
                    status_code=400,
                    detail=f"Dataset ID {extra_id} bukan dataset gambar"
                )
    elif dataset.data_type != config_type:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset bertipe '{dataset.data_type}' tapi config bertipe '{config_type}'"
        )

    prep = Preprocessing(
        dataset_id=dataset_id,
        processed_by=user_id,
        name=name,
        config={"config_type": config_type, **
                {k: v for k, v in config.items() if k != "name"}},
        status="pending",
    )
    db.add(prep)
    db.commit()
    db.refresh(prep)
    return prep


def run_preprocessing_job(preprocessing_id: int):
    """Dipanggil BackgroundTasks."""
    if ML_SERVICE_PATH not in sys.path:
        sys.path.insert(0, ML_SERVICE_PATH)

    db = SessionLocal()
    try:
        prep = db.query(Preprocessing).filter(
            Preprocessing.id == preprocessing_id).first()
        if not prep:
            return

        dataset = db.query(Dataset).filter(
            Dataset.id == prep.dataset_id).first()

        prep.status = "running"
        db.commit()

        config_type = prep.config.get("config_type")
        os.makedirs(PREPROCESSED_DIR, exist_ok=True)
        output_path = os.path.join(
            PREPROCESSED_DIR, f"prep_{preprocessing_id}")

        if config_type == "tabular":
            from preprocessing.tabular import run_tabular_preprocessing
            result = run_tabular_preprocessing(
                dataset.filepath, prep.config, output_path)

        elif config_type == "image":
            # Kumpulkan semua dataset paths
            from app.models.dataset import Dataset as DatasetModel
            dataset_paths = [dataset.filepath]
            extra_ids = prep.config.get("extra_dataset_ids", [])
            for extra_id in extra_ids:
                extra = db.query(DatasetModel).filter(
                    DatasetModel.id == extra_id).first()
                if extra:
                    dataset_paths.append(extra.filepath)

            from preprocessing.image import run_image_preprocessing
            result = run_image_preprocessing(
                dataset_paths, prep.config, output_path)

        elif config_type == "text":
            from preprocessing.text import run_text_preprocessing
            result = run_text_preprocessing(
                dataset.filepath, prep.config, output_path)

        else:
            raise ValueError(f"config_type '{config_type}' tidak dikenali")

        if result.get("status") != "completed":
            prep.status = "failed"
            prep.error_message = result.get("error", "Preprocessing gagal")
        else:
            prep.status = "completed"
            prep.output_path = output_path
            dataset.status = "preprocessed"
        # Tulis metadata otomatis
            from app.services.metadata_service import write_preprocessing_metadata
            write_preprocessing_metadata(db, prep)
        db.commit()

    except Exception as e:
        prep = db.query(Preprocessing).filter(
            Preprocessing.id == preprocessing_id).first()
        if prep:
            prep.status = "failed"
            prep.error_message = str(e)
            db.commit()
    finally:
        db.close()


def get_preprocessings(db: Session, dataset_id: int = None):
    query = db.query(Preprocessing)
    if dataset_id:
        query = query.filter(Preprocessing.dataset_id == dataset_id)
    return query.order_by(Preprocessing.id.desc()).all()


def get_preprocessing_by_id(db: Session, prep_id: int) -> Preprocessing:
    prep = db.query(Preprocessing).filter(Preprocessing.id == prep_id).first()
    if not prep:
        raise HTTPException(
            status_code=404, detail="Preprocessing tidak ditemukan")
    return prep
