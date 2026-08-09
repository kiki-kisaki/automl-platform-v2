from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from app.database import Base


class LLMAnalysis(Base):
    __tablename__ = "llm_analyses"

    id = Column(Integer, primary_key=True, index=True)
    dataset_reference_id = Column(
        Integer, ForeignKey("datasets.id"), nullable=False)
    dataset_new_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_name = Column(String, default="qwen2.5:7b")
    results = Column(Text, default="[]")
    rouge_scores = Column(Text, default="{}")
    generate_time = Column(Float, default=0)
    avg_length = Column(Float, default=0)
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
