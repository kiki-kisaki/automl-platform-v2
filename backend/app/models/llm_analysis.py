from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class LLMAnalysis(Base):
    __tablename__ = "llm_analyses"

    id = Column(Integer, primary_key=True, index=True)
    dataset_reference_id = Column(
        Integer, ForeignKey("datasets.id"), nullable=False)
    dataset_new_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    # JSON string list of {verbatim, coding, analisis}
    results = Column(Text, default="[]")
    # pending | running | completed | failed
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
