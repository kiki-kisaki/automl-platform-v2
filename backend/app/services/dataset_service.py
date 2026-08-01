import os
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.dataset import Dataset
from app.utils.file import save_tabular, save_image_zip, save_text


def upload_tabular(db: Session, user_id: int, file: UploadFile, name: str) -> Dataset:
    filepath, original_filename = save_tabular(file)

    try:
        df = pd.read_csv(filepath, sep=None, engine="python")
    except Exception:
        os.remove(filepath)
        raise HTTPException(
            status_code=400, detail="File CSV tidak valid atau rusak")

    if df.empty:
        os.remove(filepath)
        raise HTTPException(
            status_code=400, detail="File CSV tidak boleh kosong")

    if len(df.columns) < 2:
        os.remove(filepath)
        raise HTTPException(
            status_code=400, detail="File CSV harus memiliki minimal 2 kolom")

    meta = {
        "rows":    len(df),
        "columns": list(df.columns),
    }

    dataset = Dataset(
        uploaded_by=user_id,
        name=name,
        data_type="tabular",
        filepath=filepath,
        original_filename=original_filename,
        status="uploaded",
        meta=meta,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def upload_image(db: Session, user_id: int, file: UploadFile, name: str) -> Dataset:
    extract_dir, original_filename, meta = save_image_zip(file)

    dataset = Dataset(
        uploaded_by=user_id,
        name=name,
        data_type="image",
        filepath=extract_dir,
        original_filename=original_filename,
        status="uploaded",
        meta=meta,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def upload_text(db: Session, user_id: int, file: UploadFile, name: str) -> Dataset:
    filepath, original_filename = save_text(file)

    # Hitung jumlah dokumen (baris non-kosong)
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]

    meta = {
        "total_documents": len(lines),
        "labels":          [],  # akan diisi saat preprocessing oleh Data Scientist
    }

    dataset = Dataset(
        uploaded_by=user_id,
        name=name,
        data_type="text",
        filepath=filepath,
        original_filename=original_filename,
        status="uploaded",
        meta=meta,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def get_datasets(db: Session, status_filter: str = None) -> list:
    query = db.query(Dataset)
    if status_filter:
        query = query.filter(Dataset.status == status_filter)
    return query.order_by(Dataset.id.desc()).all()


def get_dataset_by_id(db: Session, dataset_id: int) -> Dataset:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")
    return dataset


def get_dataset_quality(db: Session, dataset_id: int) -> dict:
    import math
    import pandas as pd

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")

    if dataset.data_type != "tabular":
        raise HTTPException(
            status_code=400, detail="Analisis kualitas hanya tersedia untuk dataset tabular")

    try:
        df = pd.read_csv(dataset.filepath, sep=None, engine="python")
    except Exception:
        raise HTTPException(
            status_code=500, detail="File dataset tidak dapat dibaca")

    def _sanitize(val):
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val

    total_rows = len(df)
    total_cols = len(df.columns)
    duplicate_rows = int(df.duplicated().sum())
    total_missing = int(df.isnull().sum().sum())

    columns_info = []
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        missing_pct = round((missing_count / total_rows) *
                            100, 1) if total_rows > 0 else 0.0
        dtype = df[col].dtype

        if pd.api.types.is_numeric_dtype(dtype):
            col_type = "numerik"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_type = "datetime"
        else:
            col_type = "kategorikal"

        if missing_pct == 0:
            status_col = "ok"
        elif missing_pct <= 10:
            status_col = "warning"
        else:
            status_col = "error"

        columns_info.append({
            "name":          str(col),
            "type":          col_type,
            "missing_count": missing_count,
            "missing_pct":   float(missing_pct),
            "status":        status_col,
            "unique_values": int(df[col].nunique(dropna=True)),
        })

    if total_missing == 0 and duplicate_rows == 0:
        overall_status = "ok"
        overall_message = "Dataset dalam kondisi baik, siap untuk diproses"
    elif total_missing > 0 or duplicate_rows > 0:
        overall_status = "warning"
        overall_message = f"Ditemukan {total_missing} missing values dan {duplicate_rows} baris duplikat"
    else:
        overall_status = "error"
        overall_message = "Dataset memiliki masalah serius yang perlu diperhatikan"

    return {
        "dataset_id":     dataset_id,
        "filename":       dataset.original_filename,
        "total_rows":     total_rows,
        "total_cols":     total_cols,
        "duplicate_rows": duplicate_rows,
        "total_missing":  total_missing,
        "overall_status": overall_status,
        "overall_message": overall_message,
        "cleaning_actions": [
            "Missing values akan diisi dengan median (numerik) atau modus (kategorikal)",
            "Kolom kategorikal akan dikonversi dengan OneHot Encoding",
            "Fitur numerik akan dinormalisasi dengan Standard Scaler",
            "Baris duplikat akan dihapus otomatis",
        ],
        "columns": columns_info,
    }


def get_dataset_detail(db: Session, dataset_id: int) -> dict:
    import pandas as pd
    import math

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")

    result = {
        "dataset_id":        dataset.id,
        "name":              dataset.name,
        "data_type":         dataset.data_type,
        "status":            dataset.status,
        "original_filename": dataset.original_filename,
        "meta":              dataset.meta,
        "uploaded_by":       dataset.uploaded_by,
        "preview":           [],
    }

    if dataset.data_type == "tabular":
        try:
            df = pd.read_csv(dataset.filepath, sep=None, engine="python")

            def _sanitize(val):
                if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                    return None
                return val

            preview = [
                {k: _sanitize(v) for k, v in row.items()}
                for row in df.head(5).to_dict(orient="records")
            ]
            result["preview"] = preview
        except Exception:
            pass

    return result
