import os
import shutil
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.privacy_consent import PrivacyConsent, PrivacyConsentSubject
from app.models.dataset import Dataset
from app.utils.encryption import encrypt_nik
from app.config import UPLOAD_DIR


def submit_consent(
    db: Session,
    user_id: int,
    dataset_id: int,
    subjects: list,
) -> dict:
    """
    Proses privacy consent setelah upload dataset.

    Logika:
    - Ada subjek yang tidak setuju simpan → hapus file fisik + record dataset
    - Semua setuju simpan tapi ada yang tidak setuju proses → simpan, lock dari processing
    - Semua setuju keduanya → simpan dan bisa diproses
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")

    # Evaluasi consent
    all_agree_store = all(s.agree_store for s in subjects)
    all_agree_process = all(s.agree_process for s in subjects)

    # Kalau ada yang tidak setuju simpan → hapus semua
    if not all_agree_store:
        # Hapus file fisik
        try:
            if dataset.data_type == "image":
                if os.path.isdir(dataset.filepath):
                    shutil.rmtree(dataset.filepath)
            else:
                if os.path.isfile(dataset.filepath):
                    os.remove(dataset.filepath)
        except Exception:
            pass

        # Hapus record dataset dari database
        db.delete(dataset)
        db.commit()

        return {
            "result":  "rejected_store",
            "message": "Dataset tidak dapat disimpan karena ada subjek yang tidak memberikan persetujuan penyimpanan data. File telah dihapus.",
        }

    # Tentukan status akhir dataset
    if all_agree_process:
        dataset.status = "uploaded"
        consent_status_process = "approved"
    else:
        dataset.status = "locked"   # bisa disimpan tapi tidak bisa diproses
        consent_status_process = "rejected"

    consent_status_store = "approved"
    db.commit()

    # Simpan record consent
    consent = PrivacyConsent(
        dataset_id=dataset_id,
        submitted_by=user_id,
        status_store=consent_status_store,
        status_process=consent_status_process,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)

    # Simpan subjek
    for s in subjects:
        subject = PrivacyConsentSubject(
            consent_id=consent.id,
            nik_encrypted=encrypt_nik(s.nik),
            name=s.name,
            agree_store=1 if s.agree_store else 0,
            agree_process=1 if s.agree_process else 0,
        )
        db.add(subject)
    db.commit()

    if all_agree_process:
        return {
            "result":  "approved",
            "message": "Semua subjek menyetujui penyimpanan dan pemrosesan data. Dataset siap digunakan.",
        }
    else:
        return {
            "result":  "locked",
            "message": "Dataset disimpan namun tidak dapat diproses karena ada subjek yang tidak menyetujui pemrosesan data.",
        }


def get_consent(db: Session, dataset_id: int) -> dict:
    """Ambil informasi consent untuk dataset tertentu."""
    consent = db.query(PrivacyConsent).filter(
        PrivacyConsent.dataset_id == dataset_id
    ).first()

    if not consent:
        return None

    subjects = db.query(PrivacyConsentSubject).filter(
        PrivacyConsentSubject.consent_id == consent.id
    ).all()

    return {
        "consent_id":      consent.id,
        "dataset_id":      consent.dataset_id,
        "status_store":    consent.status_store,
        "status_process":  consent.status_process,
        "submitted_at":    str(consent.created_at),
        "total_subjects":  len(subjects),
        "subjects": [
            {
                "name":          s.name,
                "agree_store":   bool(s.agree_store),
                "agree_process": bool(s.agree_process),
                # NIK tidak ditampilkan untuk keamanan
            }
            for s in subjects
        ],
    }
