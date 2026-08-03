from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Metadata(Base):
    __tablename__ = "metadata"

    id = Column(Integer, primary_key=True, index=True)
    # dataset | preprocessing | experiment
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    preprocessing_id = Column(Integer, ForeignKey(
        "preprocessings.id"), nullable=True)
    experiment_id = Column(Integer, ForeignKey(
        "experiments.id"), nullable=True)
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    source = Column(String, nullable=True)
    data_type = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    properties = Column(Text, default="{}")  # JSON string
    lineage = Column(Text, default="{}")  # JSON string
