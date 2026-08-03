from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./automl_v2.db")
SECRET_KEY = os.getenv("SECRET_KEY", "ganti-ini")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/")
PREPROCESSED_DIR = os.getenv("PREPROCESSED_DIR", "preprocessed/")
MODEL_DIR = os.getenv("MODEL_DIR", "models_store/")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "100"))

PROJECT_ROOT = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", ".."))
ML_SERVICE_PATH = os.path.join(PROJECT_ROOT, "ml_service")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")
