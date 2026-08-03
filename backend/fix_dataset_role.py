# backend/fix_dataset_role.py
import pandas as pd
from app.services.dataset_service import _detect_dataset_role
from app.models.dataset import Dataset
from app.database import SessionLocal, init_db
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))


init_db()
db = SessionLocal()

for dataset in db.query(Dataset).filter(Dataset.data_type == "tabular").all():
    try:
        df = pd.read_csv(dataset.filepath, sep=None, engine="python")
        role = _detect_dataset_role(df)
        dataset.dataset_role = role
        db.commit()
        print(f"OK: {dataset.name} → {role}")
    except Exception as e:
        print(f"SKIP {dataset.name}: {e}")

db.close()
print("Selesai!")
