from dotenv import load_dotenv
import os

# Robustly locate .env in backend directory
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

# Fallback to local SQLite if DATABASE_URL is not set or empty
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL.strip() == "":
    DATABASE_URL = f"sqlite:///{os.path.join(_backend_dir, 'facefeedback.db')}"

JWT_SECRET = os.getenv("JWT_SECRET", "facefeedback_ai_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

RECOGNITION_THRESHOLD = float(os.getenv("RECOGNITION_THRESHOLD", "0.48"))
LIVENESS_THRESHOLD = float(os.getenv("LIVENESS_THRESHOLD", "0.70"))
FOCUS_THRESHOLD = float(os.getenv("FOCUS_THRESHOLD", "75.0"))
MIN_AGGREGATION_THRESHOLD = int(os.getenv("MIN_AGGREGATION_THRESHOLD", "5"))

LLM_API_KEY = os.getenv("LLM_API_KEY", "")