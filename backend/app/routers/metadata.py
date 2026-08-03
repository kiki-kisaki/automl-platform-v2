from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.services.metadata_service import get_metadata

router = APIRouter()


@router.get("/{entity_type}/{entity_id}")
def get_entity_metadata(
    entity_type:  str,
    entity_id:    int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity_type not in ("dataset", "preprocessing", "experiment"):
        raise HTTPException(
            status_code=400, detail="entity_type tidak valid. Pilihan: dataset, preprocessing, experiment")

    meta = get_metadata(db, entity_type, entity_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata tidak ditemukan")

    return {"status": "success", "data": meta}
