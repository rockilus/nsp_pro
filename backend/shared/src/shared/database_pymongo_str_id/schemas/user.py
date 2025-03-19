from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from shared.database_pymongo_str_id.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.user import Language, User


class UserSchema(DocumentBaseSchema):
    """User schema for validation."""

    email: str
    first_name: str
    last_name: str
    workers: List[str] = []
    language: str
    sign_up_at: datetime
    impersonating_user: Optional[str] = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate language is a supported language."""
        if v not in [lang.value for lang in Language]:
            raise ValueError(f"Unsupported language: {v}")
        return v

    def to_core(self) -> User:
        return User(
            id=self.id or "",
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            workers=self.workers,
            language=Language(self.language),
            sign_up_at=self.sign_up_at,
            impersonating_user_id=self.impersonating_user,
        )

    @classmethod
    def from_core(cls, user: User) -> "UserSchema":
        return cls(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            workers=user.workers,
            language=user.language.value,
            sign_up_at=user.sign_up_at,
            impersonating_user=user.impersonating_user_id,
        )
