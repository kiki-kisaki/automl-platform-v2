from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    preprocessing_id = Column(Integer, ForeignKey(
        "preprocessings.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    data_type = Column(String, nullable=False)  # tabular | image | text
    task_type = Column(String, nullable=True)   # classification | regression
    algorithm = Column(String, nullable=False)
    hyperparameters = Column(JSON, default={})
    # queued | running | completed | failed
    status = Column(String, default="queued")
    progress = Column(Integer, default=0)
    metrics = Column(JSON, nullable=True)
    model_path = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
