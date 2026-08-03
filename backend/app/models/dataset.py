from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    data_type = Column(String, nullable=False)  # tabular | image | text
    filepath = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    status = Column(String, default="uploaded")  # uploaded | preprocessed
    meta = Column(JSON, default={})
    # meta untuk tabular: {rows, columns}
    # meta untuk image:   {classes, total_images, class_counts}
    # meta untuk text:    {total_documents, labels}
    dataset_role = Column(String, default="general")
    created_at = Column(DateTime, server_default=func.now())
