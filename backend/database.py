import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

IS_VERCEL = os.environ.get("VERCEL") == "1"

if IS_VERCEL:
    # Vercel filesystem is read-only. We copy the DB to /tmp to allow writes (ephemerally)
    tmp_path = "/tmp/sql_app.db"
    if not os.path.exists(tmp_path) and os.path.exists("./sql_app.db"):
        shutil.copy2("./sql_app.db", tmp_path)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{tmp_path}"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
