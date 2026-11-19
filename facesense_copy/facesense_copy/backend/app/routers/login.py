from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.login import FaceLoginResponse
from app.services.login_service import face_login

router = APIRouter(
    prefix="/login",
    tags=["Face Login"]
)


@router.post(
    "/face",
    response_model=FaceLoginResponse
)
async def login(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return face_login(file, db)