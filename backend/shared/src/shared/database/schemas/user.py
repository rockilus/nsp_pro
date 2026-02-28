from datetime import datetime
from typing import Optional

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.user import Language, SystemRole, User


class UserSchema(DocumentBaseSchema):
    """User schema for validation."""

    email: str
    first_name: str
    last_name: str
    language: str
    sign_up_at: datetime
    impersonating_user: Optional[str] = None
    system_role: Optional[str] = None

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
            language=Language(self.language),
            sign_up_at=self.sign_up_at,
            impersonating_user_id=self.impersonating_user,
            system_role=(
                SystemRole(self.system_role) if self.system_role else None
            ),
        )

    @classmethod
    def from_core(cls, user: User) -> "UserSchema":
        return cls(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            language=user.language.value,
            sign_up_at=user.sign_up_at,
            impersonating_user=user.impersonating_user_id,
            system_role=user.system_role.value if user.system_role else None,
        )
