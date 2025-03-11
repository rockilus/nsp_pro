from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import EmailStr, field_validator

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.user import User


class UserSchema(DocumentBaseSchema):
    """User schema for validation."""

    email: EmailStr
    first_name: str
    last_name: str
    workers: List[str] = []  # Store worker IDs instead of references
    language: str
    sign_up_at: datetime = datetime.now(timezone.utc)
    impersonating_user: Optional[str] = None  # Store user ID instead of reference

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate language is one of the supported languages."""
        allowed_languages = ["en", "es", "fr"]
        if v not in allowed_languages:
            raise ValueError(f"Language must be one of {allowed_languages}")
        return v

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        out["sign_up_at"] = self.sign_up_at.timestamp()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "UserSchema":
        data["sign_up_at"] = datetime.fromtimestamp(data["sign_up_at"], timezone.utc)
        return super().from_mongo(data)

    @classmethod
    def from_core(cls, core_user: User) -> "UserSchema":
        """Convert from core User type to database schema"""
        return cls(
            id=core_user.id,
            email=core_user.email,
            first_name=core_user.first_name,
            last_name=core_user.last_name,
            workers=core_user.workers,
            language=core_user.language,
            sign_up_at=core_user.sign_up_at,
            impersonating_user=core_user.impersonating_user_id,
        )

    def to_core(self) -> User:
        """Convert to core User type"""
        doc_dict = self.to_mongo()
        doc_dict["id"] = doc_dict.pop("_id")
        doc_dict["impersonating_user_id"] = doc_dict.pop("impersonating_user", None)
        return User(**doc_dict)
