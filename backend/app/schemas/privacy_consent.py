from pydantic import BaseModel, field_validator
from typing import List, Optional


class ConsentSubject(BaseModel):
    nik:           str
    name:          str
    agree_store:   bool
    agree_process: bool
    pdf_filename:  Optional[str] = None  # nama file PDF setelah diupload

    @field_validator("nik")
    @classmethod
    def nik_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("NIK tidak boleh kosong")
        if not v.isdigit():
            raise ValueError("NIK harus berupa angka")
        if len(v) != 16:
            raise ValueError("NIK harus 16 digit")
        return v

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nama tidak boleh kosong")
        return v.strip()


class PrivacyConsentRequest(BaseModel):
    subjects: List[ConsentSubject]

    @field_validator("subjects")
    @classmethod
    def subjects_not_empty(cls, v):
        if not v:
            raise ValueError("Minimal satu subjek harus diisi")
        return v
