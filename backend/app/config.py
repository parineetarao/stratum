from pathlib import Path
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GROQ_API_KEY: str = ""
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    SANDBOX_DIR: str = str(BACKEND_DIR / "sandboxes")
    AUTO_CREATE_TABLES: bool = False
    SEED_DEMO_PROJECT: bool = False
    DEMO_DATABASE_URL: str = ""

    class Config:
        env_file = ".env"

settings = Settings()