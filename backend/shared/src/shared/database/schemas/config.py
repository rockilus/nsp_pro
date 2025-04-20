from typing import List, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.config import Config as CoreConfig


class ConfigSchema(DocumentBaseSchema):
    """Config schema for validation."""

    signup_emails_whitelist_enabled: bool
    signup_emails_whitelist: List[str] = []
    signup_emails_attempt: List[str] = []
    singleton_key: Optional[str] = "singleton"

    def to_core(self) -> CoreConfig:
        return CoreConfig(
            id=self.id or "",
            signup_emails_whitelist_enabled=self.signup_emails_whitelist_enabled,
            signup_emails_whitelist=self.signup_emails_whitelist,
            signup_emails_attempt=self.signup_emails_attempt,
        )

    @classmethod
    def from_core(cls, config: CoreConfig) -> "ConfigSchema":
        return cls(
            id=config.id,
            signup_emails_whitelist_enabled=config.signup_emails_whitelist_enabled,
            signup_emails_whitelist=config.signup_emails_whitelist,
            signup_emails_attempt=config.signup_emails_attempt,
        )
