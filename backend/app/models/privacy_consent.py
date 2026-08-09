from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class PrivacyConsent(Base):
    __tablename__ = "privacy_consents"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status_store = Column(String, nullable=False)   # approved | rejected
    status_process = Column(String, nullable=False)   # approved | rejected
    created_at = Column(DateTime, server_default=func.now())


class PrivacyConsentSubject(Base):
    __tablename__ = "privacy_consent_subjects"

    id = Column(Integer, primary_key=True, index=True)
    consent_id = Column(Integer, ForeignKey(
        "privacy_consents.id"), nullable=False)
    nik_encrypted = Column(String, nullable=False)
    name = Column(String, nullable=False)
    agree_store = Column(Integer, nullable=False, default=0)   # 0 | 1
    agree_process = Column(Integer, nullable=False, default=0)   # 0 | 1
    pdf_path = Column(String, nullable=True)
