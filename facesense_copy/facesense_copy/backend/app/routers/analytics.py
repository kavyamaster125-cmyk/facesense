from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.analytics import DashboardAnalyticsResponse
from app.services.analytics_service import dashboard_analytics
from typing import List

from app.schemas.analytics import FacultyAnalytics
from app.services.analytics_service import faculty_analytics
from app.schemas.analytics import SubjectAnalytics
from app.services.analytics_service import subject_analytics

from app.schemas.analytics import TopFacultyResponse
from app.services.analytics_service import top_faculty
from typing import List

from app.schemas.analytics import LowestFacultyResponse
from app.services.analytics_service import lowest_faculty


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get(
    "/dashboard",
    response_model=DashboardAnalyticsResponse
)
def dashboard(
    db: Session = Depends(get_db)
):
    return dashboard_analytics(db)

@router.get(
    "/faculty",
    response_model=List[FacultyAnalytics]
)
def faculty(db: Session = Depends(get_db)):
    return faculty_analytics(db)

@router.get(
    "/subject",
    response_model=list[SubjectAnalytics]
)
def subject(db: Session = Depends(get_db)):
    return subject_analytics(db)

@router.get(
    "/top-faculty",
    response_model=List[TopFacultyResponse]
)
def get_top_faculty(
    db: Session = Depends(get_db)
):
    return top_faculty(db)

@router.get(
    "/lowest-faculty",
    response_model=list[LowestFacultyResponse]
)
def get_lowest_faculty(
    db: Session = Depends(get_db)
):
    return lowest_faculty(db)