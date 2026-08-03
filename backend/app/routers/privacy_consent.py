from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import require_role, get_current_user
from app.models.user import User
from app.schemas.privacy_consent import PrivacyConsentRequest
from app.services.privacy_consent_service import submit_consent, get_consent

router = APIRouter()


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
