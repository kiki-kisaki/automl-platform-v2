from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Preprocessing(Base):
    __tablename__ = "preprocessings"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    config = Column(JSON, default={})
    # config tabular: {target_column, feature_columns, missing_strategy, encoding, scaling}
    # config image:   {image_size, grayscale, labels (renamed)}
    # config text:    {labels, remove_stopwords, language}
    output_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending | completed | failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    is_trained = Column(Integer, default=0)
    name = Column(String, nullable=True)
