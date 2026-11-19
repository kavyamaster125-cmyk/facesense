import os
import shutil

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.ai.face_detector import detect_face
from app.schemas.face import FaceRegisterResponse
from app.services.face_service import register_face


router = APIRouter(
    prefix="/face",
    tags=["Face AI"]
)

UPLOAD_FOLDER = "app/uploads/faces"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ----------------------------------------------------
# Test Face Detection
# ----------------------------------------------------
@router.post("/test")
async def test_face(file: UploadFile = File(...)):

    filepath = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    face = detect_face(filepath)

    return {
        "message": "Face detected successfully!",
        "confidence": float(face.det_score)
    }


# ----------------------------------------------------
# Register Student Face
# ----------------------------------------------------
@router.post(
    "/register/{student_id}",
    response_model=FaceRegisterResponse
)
async def register_student_face(
    student_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    return register_face(
        student_id,
        file,
        db
    )