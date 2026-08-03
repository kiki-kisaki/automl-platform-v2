from cryptography.fernet import Fernet
from app.config import ENCRYPTION_KEY


def _get_fernet() -> Fernet:
    if not ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY belum dikonfigurasi di .env")
    return Fernet(ENCRYPTION_KEY.encode())


def encrypt_nik(nik: str) -> str:
    """Enkripsi NIK sebelum disimpan ke database."""
    f = _get_fernet()
    return f.encrypt(nik.encode()).decode()


def decrypt_nik(encrypted_nik: str) -> str:
    """Dekripsi NIK untuk ditampilkan (hanya Admin)."""
    f = _get_fernet()
    return f.decrypt(encrypted_nik.encode()).decode()
