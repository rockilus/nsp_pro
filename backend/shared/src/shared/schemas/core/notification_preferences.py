"""Notification preferences schemas for NSP Pro."""

from dataclasses import dataclass

from pydantic import BaseModel, Field


@dataclass
class NotificationPreferences:
    """Core domain object for per-user notification preferences."""

    user_id: str
    email_enabled: bool = True
    email_schedule_published: bool = True
    email_swap_requests: bool = True
    email_request_decisions: bool = True
    email_assignment_changes: bool = True

    def to_dto(self) -> "NotificationPreferencesDTO":
        return NotificationPreferencesDTO(
            userId=self.user_id,
            emailEnabled=self.email_enabled,
            emailSchedulePublished=self.email_schedule_published,
            emailSwapRequests=self.email_swap_requests,
            emailRequestDecisions=self.email_request_decisions,
            emailAssignmentChanges=self.email_assignment_changes,
        )

    @classmethod
    def from_dto(cls, dto: "NotificationPreferencesDTO") -> "NotificationPreferences":
        return cls(
            user_id=dto.user_id,
            email_enabled=dto.email_enabled,
            email_schedule_published=dto.email_schedule_published,
            email_swap_requests=dto.email_swap_requests,
            email_request_decisions=dto.email_request_decisions,
            email_assignment_changes=dto.email_assignment_changes,
        )


class NotificationPreferencesDTO(BaseModel):
    """Pydantic DTO for NotificationPreferences (camelCase)."""

    user_id: str = Field(..., alias="userId")
    email_enabled: bool = Field(default=True, alias="emailEnabled")
    email_schedule_published: bool = Field(default=True, alias="emailSchedulePublished")
    email_swap_requests: bool = Field(default=True, alias="emailSwapRequests")
    email_request_decisions: bool = Field(default=True, alias="emailRequestDecisions")
    email_assignment_changes: bool = Field(default=True, alias="emailAssignmentChanges")

    model_config = {"populate_by_name": True}
