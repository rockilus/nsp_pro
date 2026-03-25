"""Notification preferences schemas for NSP Pro."""

from dataclasses import dataclass, field
from enum import StrEnum

from pydantic import BaseModel, Field


class NotificationKey(StrEnum):
    SCHEDULE_PUBLISHED = "schedule_published"
    SWAP_REQUESTS = "swap_requests"
    REQUEST_DECISIONS = "request_decisions"
    ASSIGNMENT_CHANGES = "assignment_changes"


@dataclass
class ChannelPreferences:
    email: bool = True
    in_app: bool = True


@dataclass
class NotificationPreferences:
    """Core domain object for per-user notification preferences."""

    user_id: str
    preferences: dict[NotificationKey, ChannelPreferences] = field(
        default_factory=lambda: {
            k: ChannelPreferences() for k in NotificationKey
        }
    )

    def to_dto(self) -> "NotificationPreferencesDTO":
        return NotificationPreferencesDTO(
            userId=self.user_id,
            preferences={
                key: ChannelPreferencesDTO(email=ch.email, inApp=ch.in_app)
                for key, ch in self.preferences.items()
            },
        )

    @classmethod
    def from_dto(
        cls, dto: "NotificationPreferencesDTO"
    ) -> "NotificationPreferences":
        valid_keys = {k.value for k in NotificationKey}
        return cls(
            user_id=dto.user_id,
            preferences={
                NotificationKey(key): ChannelPreferences(
                    email=ch.email, in_app=ch.in_app
                )
                for key, ch in dto.preferences.items()
                if key in valid_keys
            },
        )


class ChannelPreferencesDTO(BaseModel):
    email: bool = True
    in_app: bool = Field(default=True, alias="inApp")

    model_config = {"populate_by_name": True}


class NotificationPreferencesDTO(BaseModel):
    """Pydantic DTO for NotificationPreferences (camelCase)."""

    user_id: str = Field(..., alias="userId")
    preferences: dict[str, ChannelPreferencesDTO] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}
