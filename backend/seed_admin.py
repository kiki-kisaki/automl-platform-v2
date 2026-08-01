"""
Jalankan sekali saja untuk membuat akun admin pertama.
Usage: py -3.12 seed_admin.py
"""
from app.utils.auth import hash_password
from app.models.user import User
from app.database import SessionLocal, init_db
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))


init_db()
db = SessionLocal()

existing = db.query(User).filter(User.email == "admin@automl.com").first()
if existing:
    print("Admin sudah ada.")
else:
    admin = User(
        username="admin",
        email="admin@automl.com",
        password_hash=hash_password("admin123"),
        role="admin",
        is_active=1,
    )
    db.add(admin)
    db.commit()
    print("Admin berhasil dibuat!")
    print("Email   : admin@automl.com")
    print("Password: admin123")

db.close()
