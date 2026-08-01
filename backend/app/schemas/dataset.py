from pydantic import BaseModel
from typing import Optional


class DatasetResponse(BaseModel):
    dataset_id:        int
    name:              str
    data_type:         str
    status:            str
    original_filename: str
    meta:              dict
    uploaded_by:       int
