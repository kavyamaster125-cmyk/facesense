from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.admin import AdminUser
from app.security import create_access_token

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def login_admin(data, db: Session):

    admin = (
        db.query(AdminUser)
        .filter(AdminUser.email == data.email)
        .first()
    )

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    if not pwd_context.verify(
        data.password,
        admin.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token(
        {
            "sub": admin.email,
            "role": admin.role
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }