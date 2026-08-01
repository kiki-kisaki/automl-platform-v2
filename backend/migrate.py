from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(
            text("ALTER TABLE preprocessings ADD COLUMN name VARCHAR"))
        conn.commit()
        print("Migration berhasil")
    except Exception as e:
        print(f"Error: {e}")
