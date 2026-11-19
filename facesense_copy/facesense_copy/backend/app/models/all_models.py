from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Boolean,
    Text,
    Float,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.sql import func
from app.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="SUPER_ADMIN")  # SUPER_ADMIN or FACULTY
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)


class AcademicClass(Base):
    __tablename__ = "academic_classes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    department_code = Column(String(20), nullable=False)
    semester = Column(Integer, nullable=False)
    division = Column(String(10), nullable=False, default="A")


class Student(Base):
    __tablename__ = "students"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    enrollment_no = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=True)
    department = Column(String(50), nullable=False)
    semester = Column(Integer, nullable=False)
    division = Column(String(10), nullable=False, default="A")
    attendance_percentage = Column(Float, default=0, nullable=False)
    cpi = Column(Float, default=0.0, nullable=False)

    face_image_path = Column(Text, nullable=True)
    is_registered = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    student_id = Column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    embedding_json = Column(Text, nullable=False)  # JSON serialized array of float 512-dim embedding
    model_version = Column(String(50), default="arcface_v1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    faculty_code = Column(String(30), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    department = Column(String(50), nullable=False)
    designation = Column(String(50), default="Assistant Professor")
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    subject_code = Column(String(20), unique=True, nullable=False)
    subject_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False, default="Computer Engineering")
    semester = Column(Integer, nullable=False)


class FacultySubject(Base):
    __tablename__ = "faculty_subjects"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    faculty_id = Column(BigInteger, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(BigInteger, ForeignKey("subjects.id"), nullable=False)
    division = Column(String(10), default="A")
    semester = Column(Integer, nullable=False, default=1)
    academic_year = Column(String(20), default="2025-2026")


class FeedbackCycle(Base):
    __tablename__ = "feedback_sessions"  # Maps to feedback_sessions table for backward compatibility

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_name = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE or CLOSED
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FeedbackQuestion(Base):
    __tablename__ = "feedback_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)  # star, swipe, slider, mcq, suggestion
    options_json = Column(Text, nullable=True)  # JSON options for MCQ or slider bounds
    order_num = Column(Integer, default=1)
    is_required = Column(Boolean, default=True)


class FeedbackResponse(Base):
    __tablename__ = "feedback_responses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    feedback_cycle_id = Column(BigInteger, ForeignKey("feedback_sessions.id"), nullable=False)
    student_id = Column(BigInteger, ForeignKey("students.id"), nullable=False)
    faculty_id = Column(BigInteger, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(BigInteger, ForeignKey("subjects.id"), nullable=False)

    # 5 Question types responses
    star_rating = Column(Integer, nullable=True)        # Q1: 1-5 Star
    swipe_response = Column(String(20), nullable=True)  # Q2: AGREE / DISAGREE
    slider_value = Column(Integer, nullable=True)       # Q3: 0-100 Slider
    mcq_option = Column(String(100), nullable=True)     # Q4: Choice string
    suggestion_text = Column(Text, nullable=True)       # Q5: Text suggestion

    # AI Focus & Liveness evaluation
    focus_score = Column(Float, default=85.0)
    liveness_passed = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # CRITICAL MULTI-COLUMN UNIQUE CONSTRAINT FOR DUPLICATE PREVENTION AT DB LEVEL
    __table_args__ = (
        UniqueConstraint(
            'student_id', 'faculty_id', 'subject_id', 'feedback_cycle_id',
            name='uq_student_faculty_subject_cycle'
        ),
    )


class StudentFeedbackStatus(Base):
    __tablename__ = "student_feedback_status"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    student_id = Column(BigInteger, ForeignKey("students.id"), nullable=False)
    session_id = Column(BigInteger, ForeignKey("feedback_sessions.id"), nullable=False)
    submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class RewardRule(Base):
    __tablename__ = "reward_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    is_enabled = Column(Boolean, default=True)
    min_focus_score = Column(Float, default=75.0)
    min_liveness_confidence = Column(Float, default=0.70)
    reward_probability = Column(Float, default=0.80)  # 80% chance if eligible
    daily_reward_limit = Column(Integer, default=50)
    reward_type = Column(String(50), default="Coffee Coupon")
    available_quantity = Column(Integer, default=100)


class RewardClaim(Base):
    __tablename__ = "reward_claims"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    student_id = Column(BigInteger, ForeignKey("students.id"), nullable=False)
    feedback_cycle_id = Column(BigInteger, ForeignKey("feedback_sessions.id"), nullable=False)
    reward_type = Column(String(50), nullable=False)
    coupon_code = Column(String(50), unique=True, nullable=False)
    status = Column(String(20), default="CLAIMED")
    claimed_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    setting_key = Column(String(50), unique=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    category = Column(String(50), default="GENERAL")
    description = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_email = Column(String(120), nullable=True)
    role = Column(String(30), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default="SUCCESS")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
