from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.models import Base

db_url = settings.DATABASE_URL

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate SQLite schema for notification_logs table if columns are missing
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if 'notification_logs' in tables:
            existing_cols = [c['name'] for c in inspector.get_columns('notification_logs')]
            with engine.connect() as conn:
                if 'user_id' not in existing_cols:
                    conn.execute(text("ALTER TABLE notification_logs ADD COLUMN user_id VARCHAR(36)"))
                if 'masked_phone_number' not in existing_cols:
                    conn.execute(text("ALTER TABLE notification_logs ADD COLUMN masked_phone_number VARCHAR(20)"))
                if 'provider' not in existing_cols:
                    conn.execute(text("ALTER TABLE notification_logs ADD COLUMN provider VARCHAR(30) DEFAULT 'TWILIO'"))
                if 'error_code' not in existing_cols:
                    conn.execute(text("ALTER TABLE notification_logs ADD COLUMN error_code VARCHAR(50)"))
                conn.commit()
    except Exception as e:
        print(f"[DB MIGRATION NOTICE] Auto-migration check: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
