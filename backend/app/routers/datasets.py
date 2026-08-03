from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
import os
from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.services.dataset_service import (
    upload_tabular, upload_image, upload_text,
    get_datasets, get_dataset_by_id,
)
from app.models.dataset import Dataset

router = APIRouter()

DataEngineerOnly = Depends(require_role("data_engineer"))
DataScientistOnly = Depends(require_role("data_scientist"))


@router.post("/upload/tabular", status_code=201)
def upload_tabular_endpoint(
    file: UploadFile = File(...),
    name: str = Form(...),
    db:   Session = Depends(get_db),
    current_user: User = Depends(require_role("data_engineer")),
):
    dataset = upload_tabular(db, current_user.id, file, name)
    return {
        "status":  "success",
        "message": f"Dataset tabular '{dataset.name}' berhasil diupload",
        "data": {
            "dataset_id": dataset.id,
            "name":       dataset.name,
            "data_type":  dataset.data_type,
            "status":     dataset.status,
            "meta":       dataset.meta,
        }
    }


@router.post("/upload/image", status_code=201)
def upload_image_endpoint(
    file: UploadFile = File(...),
    name: str = Form(...),
    db:   Session = Depends(get_db),
    current_user: User = Depends(require_role("data_engineer")),
):
    dataset = upload_image(db, current_user.id, file, name)
    return {
        "status":  "success",
        "message": f"Dataset gambar '{dataset.name}' berhasil diupload",
        "data": {
            "dataset_id":  dataset.id,
            "name":        dataset.name,
            "data_type":   dataset.data_type,
            "status":      dataset.status,
            "meta":        dataset.meta,
        }
    }


@router.post("/upload/text", status_code=201)
def upload_text_endpoint(
    file: UploadFile = File(...),
    name: str = Form(...),
    db:   Session = Depends(get_db),
    current_user: User = Depends(require_role("data_engineer")),
):
    dataset = upload_text(db, current_user.id, file, name)
    return {
        "status":  "success",
        "message": f"Dataset teks '{dataset.name}' berhasil diupload",
        "data": {
            "dataset_id":      dataset.id,
            "name":            dataset.name,
            "data_type":       dataset.data_type,
            "status":          dataset.status,
            "meta":            dataset.meta,
        }
    }


@router.get("")
def list_datasets(
    status:   Optional[str] = Query(
        None, description="Filter: uploaded | preprocessed"),
    db:       Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    datasets = get_datasets(db, status_filter=status)
    return {
        "status": "success",
        "data": [
            {
                "dataset_id":        d.id,
                "name":              d.name,
                "data_type":         d.data_type,
                "status":            d.status,
                "original_filename": d.original_filename,
                "meta":              d.meta,
                "uploaded_by":       d.uploaded_by,
                "dataset_role":      d.dataset_role or "general",
            }
            for d in datasets
        ]
    }


@router.get("/{dataset_id}")
def get_dataset(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.dataset_service import get_dataset_detail
    data = get_dataset_detail(db, dataset_id)
    return {"status": "success", "data": data}


@router.get("/{dataset_id}/quality")
def quality(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.dataset_service import get_dataset_quality
    result = get_dataset_quality(db, dataset_id)
    return {"status": "success", "data": result}


@router.get("/{dataset_id}/preview-images")
def preview_images(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import base64
    import os

    ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png",
                       ".bmp", ".gif", ".webp", ".avif"}

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")
    if dataset.data_type != "image":
        raise HTTPException(
            status_code=400, detail="Hanya untuk dataset gambar")

    extract_dir = dataset.filepath
    if not os.path.isdir(extract_dir):
        raise HTTPException(
            status_code=404, detail="Folder dataset tidak ditemukan di server")

    result = []
    for folder in sorted(os.listdir(extract_dir)):
        folder_path = os.path.join(extract_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        images = [
            f for f in os.listdir(folder_path)
            if os.path.splitext(f)[1].lower() in ALLOWED_IMG_EXT
        ]
        if not images:
            continue

        samples = []
        for img_file in images[:4]:
            img_path = os.path.join(folder_path, img_file)
            try:
                from PIL import Image
                import io
                img = Image.open(img_path).convert("RGB")
                img.thumbnail((200, 200))  # resize kecil untuk preview
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=80)
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                samples.append(f"data:image/jpeg;base64,{b64}")
            except Exception:
                continue

        result.append({
            "folder":       folder,
            "total_images": len(images),
            "samples":      samples,
        })

    return {"status": "success", "data": result}


@router.patch("/{dataset_id}/status")
def update_status(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(require_role("data_scientist")),
):
    """Toggle status dataset antara uploaded ↔ preprocessed secara manual."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")

    # Toggle status
    if dataset.status == "uploaded":
        dataset.status = "preprocessed"
    else:
        dataset.status = "uploaded"

    db.commit()
    db.refresh(dataset)
    return {
        "status":  "success",
        "message": f"Status dataset diubah ke '{dataset.status}'",
        "data": {
            "dataset_id": dataset.id,
            "status":     dataset.status,
        }
    }


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(require_role("data_scientist")),
):
    """Hapus dataset dan file fisiknya. Hasil preprocessing TIDAK ikut dihapus."""
    import shutil

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")

    # Hapus file/folder fisik
    try:
        if dataset.data_type == "image":
            # Dataset gambar berupa folder
            if os.path.isdir(dataset.filepath):
                shutil.rmtree(dataset.filepath)
        else:
            # Dataset tabular/text berupa file
            if os.path.isfile(dataset.filepath):
                os.remove(dataset.filepath)
    except Exception:
        pass  # Lanjut hapus record meskipun file sudah tidak ada

    db.delete(dataset)
    db.commit()

    return {
        "status":  "success",
        "message": f"Dataset '{dataset.name}' berhasil dihapus",
    }


@router.get("/{dataset_id}/documents")
def get_documents(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ambil semua dokumen dari file teks."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")
    if dataset.data_type != "text":
        raise HTTPException(status_code=400, detail="Hanya untuk dataset teks")

    try:
        with open(dataset.filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = [l.rstrip("\n") for l in f.readlines()]
    except Exception:
        raise HTTPException(status_code=500, detail="Gagal membaca file teks")

    documents = [
        {"index": i, "text": line, "is_empty": len(line.strip()) == 0}
        for i, line in enumerate(lines)
    ]

    return {
        "status": "success",
        "data": {
            "total":     len(documents),
            "documents": documents,
        }
    }
