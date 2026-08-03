import json
from sqlalchemy.orm import Session
from app.models.metadata import Metadata
from app.models.dataset import Dataset
from app.models.preprocessing import Preprocessing
from app.models.experiment import Experiment
from app.models.user import User


def _get_username(db: Session, user_id: int) -> str:
    if not user_id:
        return "-"
    user = db.query(User).filter(User.id == user_id).first()
    return user.username if user else "-"


def write_dataset_metadata(db: Session, dataset: Dataset) -> Metadata:
    """Tulis metadata saat dataset diupload."""
    properties = {
        "original_filename": dataset.original_filename,
        "data_type":         dataset.data_type,
        "dataset_role":      dataset.dataset_role,
        **dataset.meta,
    }

    lineage = {
        "uploaded_by":      _get_username(db, dataset.uploaded_by),
        "uploaded_by_id":   dataset.uploaded_by,
        "upload_time":      str(dataset.created_at),
        "preprocessings":   [],
        "experiments":      [],
    }

    meta = Metadata(
        entity_type="dataset",
        entity_id=dataset.id,
        dataset_id=dataset.id,
        name=dataset.name,
        data_type=dataset.data_type,
        created_by=dataset.uploaded_by,
        properties=json.dumps(properties),
        lineage=json.dumps(lineage),
    )
    db.add(meta)
    db.commit()
    db.refresh(meta)
    return meta


def write_preprocessing_metadata(db: Session, prep: Preprocessing) -> Metadata:
    """Tulis metadata saat preprocessing selesai."""
    dataset = db.query(Dataset).filter(Dataset.id == prep.dataset_id).first()

    properties = {
        "config":      prep.config,
        "output_path": prep.output_path,
        "status":      prep.status,
    }

    dataset_meta = db.query(Metadata).filter(
        Metadata.entity_type == "dataset",
        Metadata.entity_id == prep.dataset_id,
    ).first()

    dataset_lineage = json.loads(dataset_meta.lineage) if dataset_meta else {}

    lineage = {
        "dataset_id":           prep.dataset_id,
        "dataset_name":         dataset.name if dataset else "-",
        "uploaded_by":          dataset_lineage.get("uploaded_by", "-"),
        "preprocessed_by":      _get_username(db, prep.processed_by),
        "preprocessed_by_id":   prep.processed_by,
        "preprocess_time":      str(prep.created_at),
        "experiments":          [],
    }

    meta = Metadata(
        entity_type="preprocessing",
        entity_id=prep.id,
        dataset_id=prep.dataset_id,
        preprocessing_id=prep.id,
        name=prep.name or f"Preprocessing #{prep.id}",
        data_type=dataset.data_type if dataset else None,
        created_by=prep.processed_by,
        properties=json.dumps(properties),
        lineage=json.dumps(lineage),
    )
    db.add(meta)
    db.commit()
    db.refresh(meta)

    # ← TAMBAHKAN INI: Update lineage di metadata dataset
    if dataset_meta:
        dl = json.loads(dataset_meta.lineage)
        dl.setdefault("preprocessings", []).append({
            "preprocessing_id": prep.id,
            "name":             prep.name or f"Preprocessing #{prep.id}",
            "preprocessed_by":  _get_username(db, prep.processed_by),
        })
        dataset_meta.lineage = json.dumps(dl)
        db.commit()

    return meta


def write_experiment_metadata(db: Session, exp: Experiment) -> Metadata:
    """Tulis metadata saat training selesai."""
    from app.models.preprocessing import Preprocessing

    prep = db.query(Preprocessing).filter(
        Preprocessing.id == exp.preprocessing_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == exp.dataset_id).first()

    # Ambil lineage dari metadata preprocessing
    prep_meta = db.query(Metadata).filter(
        Metadata.entity_type == "preprocessing",
        Metadata.entity_id == exp.preprocessing_id,
    ).first()
    prep_lineage = json.loads(prep_meta.lineage) if prep_meta else {}

    properties = {
        "algorithm":       exp.algorithm,
        "task_type":       exp.task_type,
        "data_type":       exp.data_type,
        "hyperparameters": exp.hyperparameters,
        "metrics":         exp.metrics,
        "model_path":      exp.model_path,
        "status":          exp.status,
    }

    lineage = {
        "dataset_id":           exp.dataset_id,
        "dataset_name":         dataset.name if dataset else "-",
        "preprocessing_id":     exp.preprocessing_id,
        "preprocessing_name": prep.name if (prep and prep.name) else f"Preprocessing #{exp.preprocessing_id}",
        "uploaded_by":          prep_lineage.get("uploaded_by", "-"),
        "preprocessed_by":      prep_lineage.get("preprocessed_by", "-"),
        "trained_by":           _get_username(db, exp.created_by),
        "trained_by_id":        exp.created_by,
        "training_time":        str(exp.created_at),
    }

    meta = Metadata(
        entity_type="experiment",
        entity_id=exp.id,
        dataset_id=exp.dataset_id,
        preprocessing_id=exp.preprocessing_id,
        experiment_id=exp.id,
        name=exp.name,
        data_type=exp.data_type,
        created_by=exp.created_by,
        properties=json.dumps(properties),
        lineage=json.dumps(lineage),
    )
    db.add(meta)
    db.commit()
    db.refresh(meta)

    # Update lineage di metadata dataset — tambahkan experiment ini
    if dataset_meta := db.query(Metadata).filter(
        Metadata.entity_type == "dataset",
        Metadata.entity_id == exp.dataset_id,
    ).first():
        dl = json.loads(dataset_meta.lineage)
        dl.setdefault("experiments", []).append({
            "experiment_id": exp.id,
            "name":          exp.name,
            "algorithm":     exp.algorithm,
            "trained_by":    _get_username(db, exp.created_by),
        })
        dataset_meta.lineage = json.dumps(dl)
        db.commit()

    return meta


def get_metadata(db: Session, entity_type: str, entity_id: int) -> dict:
    """Ambil metadata berdasarkan entity_type dan entity_id."""
    meta = db.query(Metadata).filter(
        Metadata.entity_type == entity_type,
        Metadata.entity_id == entity_id,
    ).first()

    if not meta:
        return None

    return {
        "id":                meta.id,
        "entity_type":       meta.entity_type,
        "entity_id":         meta.entity_id,
        "name":              meta.name,
        "data_type":         meta.data_type,
        "created_at":        str(meta.created_at),
        "properties":        json.loads(meta.properties or "{}"),
        "lineage":           json.loads(meta.lineage or "{}"),
    }
