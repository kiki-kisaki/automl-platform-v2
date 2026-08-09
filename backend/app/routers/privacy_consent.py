import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.privacy_consent import PrivacyConsent, PrivacyConsentSubject
from app.schemas.privacy_consent import PrivacyConsentRequest
from app.services.privacy_consent_service import submit_consent, get_consent

router = APIRouter()

PDF_UPLOAD_DIR = "consent_pdfs"
os.makedirs(PDF_UPLOAD_DIR, exist_ok=True)


@router.post("/upload-pdf")
async def upload_consent_pdf(
    file:         UploadFile = File(...),
    current_user: User = Depends(require_role("data_engineer")),
):
    """Upload PDF bukti consent per subjek."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Hanya file PDF yang diperbolehkan")

    # Simpan dengan nama unik
    import uuid
    unique_name = f"{uuid.uuid4().hex}.pdf"
    filepath = os.path.join(PDF_UPLOAD_DIR, unique_name)

    with open(filepath, "wb") as f:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # max 10MB
            raise HTTPException(
                status_code=400, detail="Ukuran PDF maksimal 10MB")
        f.write(content)

    return {
        "status":    "success",
        "data": {
            "pdf_filename": unique_name,
            "original_name": file.filename,
        }
    }


@router.post("/{dataset_id}")
def submit_privacy_consent(
    dataset_id:   int,
    payload:      PrivacyConsentRequest,
    db:           Session = Depends(get_db),
    current_user: User = Depends(require_role("data_engineer")),
):
    result = submit_consent(
        db,
        user_id=current_user.id,
        dataset_id=dataset_id,
        subjects=payload.subjects,
    )
    return {"status": "success", "data": result}


@router.get("/{dataset_id}")
def get_privacy_consent(
    dataset_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consent = get_consent(db, dataset_id)
    if not consent:
        raise HTTPException(
            status_code=404,
            detail="Consent belum disubmit untuk dataset ini"
        )
    return {"status": "success", "data": consent}


@router.get("/{dataset_id}/download-pdf/{subject_index}")
def download_consent_pdf(
    dataset_id:    int,
    subject_index: int,
    db:            Session = Depends(get_db),
    current_user:  User = Depends(get_current_user),
):
    """Download PDF bukti consent per subjek berdasarkan index."""
    consent = db.query(PrivacyConsent).filter(
        PrivacyConsent.dataset_id == dataset_id
    ).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent tidak ditemukan")

    subjects = db.query(PrivacyConsentSubject).filter(
        PrivacyConsentSubject.consent_id == consent.id
    ).all()

    if subject_index >= len(subjects):
        raise HTTPException(status_code=404, detail="Subjek tidak ditemukan")

    subject = subjects[subject_index]
    if not subject.pdf_path:
        raise HTTPException(
            status_code=404, detail="PDF bukti tidak ditemukan")

    filepath = os.path.join(PDF_UPLOAD_DIR, subject.pdf_path)
    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=404, detail="File PDF tidak ditemukan di server")

    return FileResponse(
        path=filepath,
        filename=f"consent_{subject.name}_{dataset_id}.pdf",
        media_type="application/pdf",
    )
