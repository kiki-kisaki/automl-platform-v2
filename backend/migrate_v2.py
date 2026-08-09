from app.database import engine
from sqlalchemy import text

migrations = [
    # Tambah kolom dataset_role di tabel datasets
    "ALTER TABLE datasets ADD COLUMN dataset_role VARCHAR DEFAULT 'general'",

    # Tabel metadata — lineage semua entitas
    """CREATE TABLE IF NOT EXISTS metadata (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type  VARCHAR NOT NULL,
        entity_id    INTEGER NOT NULL,
        dataset_id   INTEGER,
        preprocessing_id INTEGER,
        experiment_id    INTEGER,
        name         VARCHAR,
        description  VARCHAR,
        source       VARCHAR,
        data_type    VARCHAR,
        created_by   INTEGER,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        properties   TEXT DEFAULT '{}',
        lineage      TEXT DEFAULT '{}'
    )""",

    # Tabel privacy_consents
    """CREATE TABLE IF NOT EXISTS privacy_consents (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id      INTEGER NOT NULL,
        submitted_by    INTEGER NOT NULL,
        status_store    VARCHAR NOT NULL,
        status_process  VARCHAR NOT NULL,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",

    # Tabel privacy_consent_subjects — satu baris per subjek
    """CREATE TABLE IF NOT EXISTS privacy_consent_subjects (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        consent_id      INTEGER NOT NULL,
        nik_encrypted   VARCHAR NOT NULL,
        name            VARCHAR NOT NULL,
        agree_store     INTEGER NOT NULL DEFAULT 0,
        agree_process   INTEGER NOT NULL DEFAULT 0
    )""",

    # Tabel llm_analyses
    """CREATE TABLE IF NOT EXISTS llm_analyses (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_reference_id INTEGER NOT NULL,
        dataset_new_id       INTEGER NOT NULL,
        created_by           INTEGER NOT NULL,
        results              TEXT DEFAULT '[]',
        status               VARCHAR DEFAULT 'pending',
        error_message        VARCHAR,
        created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",

    "ALTER TABLE llm_analyses ADD COLUMN model_name VARCHAR DEFAULT 'qwen2.5:7b'",
    "ALTER TABLE llm_analyses ADD COLUMN rouge_scores TEXT DEFAULT '{}'",
    "ALTER TABLE llm_analyses ADD COLUMN generate_time REAL DEFAULT 0",
    "ALTER TABLE llm_analyses ADD COLUMN avg_length REAL DEFAULT 0",
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"OK: {sql[:60]}...")
        except Exception as e:
            print(f"SKIP: {str(e)[:80]}")

print("\nMigration selesai!")
