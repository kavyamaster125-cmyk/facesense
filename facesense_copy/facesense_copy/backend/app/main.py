import os
import time
import uuid
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.logger import logger, access_logger
from app.database import Base, engine, SessionLocal
import app.models.all_models as models
from app.security import hash_password
from app.routers import student_portal, faculty_portal, admin_portal

# Auto-create all tables in DB
Base.metadata.create_all(bind=engine)

# Safe migration: add new columns to existing tables without dropping data
def safe_migrate():
    from sqlalchemy import text, inspect as sa_inspect
    try:
        with engine.connect() as conn:
            inspector = sa_inspect(engine)
            columns = [c["name"] for c in inspector.get_columns("students")]
            if "attendance_percentage" not in columns:
                conn.execute(text("ALTER TABLE students ADD COLUMN attendance_percentage FLOAT DEFAULT 0"))
                conn.commit()
                logger.info("Migration: Added attendance_percentage column to students table.")
            if "cpi" not in columns:
                conn.execute(text("ALTER TABLE students ADD COLUMN cpi FLOAT DEFAULT 0.0"))
                conn.commit()
                logger.info("Migration: Added cpi column to students table.")
    except Exception as e:
        logger.warning(f"Migration note: {e}")

safe_migrate()


def seed_database():
    """Initializes default seed data if database is fresh."""
    try:
        from seed_scet_data import seed_all
        seed_all()
        logger.info("Database seeding checked and verified.")
    except Exception as e:
        logger.error(f"Error running seed_all: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=================================================================")
    logger.info("Initializing FaceSense AI Backend and Database Seeds...")
    logger.info(f"Process PID: {os.getpid()}")
    seed_database()
    logger.info("FaceSense AI Backend is Ready to accept traffic!")
    logger.info("=================================================================")
    yield
    logger.info("Shutting down FaceSense AI Backend...")


app = FastAPI(
    title="FaceSense AI — Confidential Faculty Feedback System",
    description="Production-grade AI-based faculty feedback system with face recognition, liveness detection, privacy confidentiality, and analytics.",
    version="2.0.0",
    lifespan=lifespan
)

# ------------------------------ HTTP Logging & Tracing Middleware ------------------------------ #
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Production-grade request logging middleware:
    - Injects unique X-Request-ID for correlation tracing.
    - Records start time and computes latency in milliseconds.
    - Captures client IP, HTTP method, URL path, and status code.
    - Logs to access.log and error.log on failures.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    # Resolve real client IP
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    start_time = time.perf_counter()

    try:
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Inject tracing headers into the response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms}ms"

        # Record HTTP access log
        log_line = (
            f"{client_ip:<15} | {request.method:<6} {request.url.path:<35} | "
            f"Status: {response.status_code} | {duration_ms:>7.2f}ms | req_id={request_id}"
        )
        access_logger.info(log_line)

        return response
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.critical(
            f"Unhandled server error processing {request.method} {request.url.path} "
            f"from {client_ip} after {duration_ms}ms (req_id={request_id}): {exc}",
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error occurred during request processing.",
                "request_id": request_id
            },
            headers={
                "X-Request-ID": request_id,
                "X-Process-Time": f"{duration_ms}ms"
            }
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount Routers
app.include_router(student_portal.router)
app.include_router(faculty_portal.router)
app.include_router(admin_portal.router)


@app.get("/")
def root():
    from app.services.face_recognition_service import SCRFD_DETECTOR, ARCFACE_RECOGNIZER, AI_ERROR
    ai_status = "Pure ONNX ArcFace (Production)" if (SCRFD_DETECTOR and ARCFACE_RECOGNIZER) else "Fallback Heuristic"
    return {
        "app": "FaceSense AI",
        "status": "online",
        "version": "2.0.0",
        "documentation": "/docs",
        "ai_engine": ai_status,
        "ai_error": AI_ERROR
    }
