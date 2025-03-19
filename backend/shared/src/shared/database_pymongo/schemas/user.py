from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from pydantic import field_validator

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.user import Language, User


class UserSchema(DocumentBaseSchema):
    """User schema for validation."""

    email: str
    first_name: str
    last_name: str
    workers: List[ObjectId] = []
    language: str
    sign_up_at: datetime
    impersonating_user: Optional[ObjectId] = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate language is a supported language."""
        if v not in [lang.value for lang in Language]:
            raise ValueError(f"Unsupported language: {v}")
        return v

    def to_core(self) -> User:
        return User(
            id=str(self.id) or "",
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            workers=[str(worker) for worker in self.workers],
            language=Language(self.language),
            sign_up_at=self.sign_up_at,
            impersonating_user_id=(
                str(self.impersonating_user) if self.impersonating_user else None
            ),
        )

    @classmethod
    def from_core(cls, user: User) -> "UserSchema":
        return cls(
            id=(ObjectId(user.id) if user.id and ObjectId.is_valid(user.id) else None),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            workers=[ObjectId(worker) for worker in user.workers],
            language=user.language.value,
            sign_up_at=user.sign_up_at,
            impersonating_user=(
                ObjectId(user.impersonating_user_id)
                if user.impersonating_user_id
                and ObjectId.is_valid(user.impersonating_user_id)
                else None
            ),
        )
