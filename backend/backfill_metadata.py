from app.services.metadata_service import (
    write_dataset_metadata,
    write_preprocessing_metadata,
    write_experiment_metadata,
)
from app.models.experiment import Experiment
from app.models.preprocessing import Preprocessing
from app.models.dataset import Dataset
from app.database import SessionLocal, init_db
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))


init_db()
db = SessionLocal()

# Backfill datasets
print("=== Backfill Datasets ===")
for dataset in db.query(Dataset).all():
    try:
        write_dataset_metadata(db, dataset)
        print(f"OK: Dataset #{dataset.id} — {dataset.name}")
    except Exception as e:
        print(f"SKIP #{dataset.id}: {e}")

# Backfill preprocessings
print("\n=== Backfill Preprocessings ===")
for prep in db.query(Preprocessing).filter(Preprocessing.status == "completed").all():
    try:
        write_preprocessing_metadata(db, prep)
        print(f"OK: Preprocessing #{prep.id} — {prep.name}")
    except Exception as e:
        print(f"SKIP #{prep.id}: {e}")

# Backfill experiments
print("\n=== Backfill Experiments ===")
for exp in db.query(Experiment).filter(Experiment.status == "completed").all():
    try:
        write_experiment_metadata(db, exp)
        print(f"OK: Experiment #{exp.id} — {exp.name}")
    except Exception as e:
        print(f"SKIP #{exp.id}: {e}")

db.close()
print("\nBackfill selesai!")
