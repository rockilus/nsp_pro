from datetime import datetime, timezone
from typing import List, Optional

from pydantic import ConfigDict, Field, field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.multitasking import (
    MultitaskingGroup,
    MultitaskingGroupType,
)


class MultitaskingGroupSchema(DocumentBaseSchema):
    """Database schema for multitasking group."""

    type: str = Field(
        ...,
        description="Type of multitasking group (shift_demand, "
        + "shift_demand_template, assignment)",
    )
    team_id: str = Field(..., description="Team ID")
    related_ids: List[str] = Field(
        ..., description="List of related entity IDs (must have at least 2)"
    )
    shift_demand_template_id: Optional[str] = Field(
        default=None,
        description="ID of the associated shift demand template, if applicable",
    )
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp(),
        description="Creation timestamp (Unix epoch)",
    )
    updated_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp(),
        description="Last update timestamp (Unix epoch)",
    )
    notes: Optional[str] = Field(default=None, description="Optional notes")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"shift_demand", "shift_demand_template", "assignment"}
        if v not in allowed:
            raise ValueError(f"Invalid multitasking group type: {v}")
        return v

    @field_validator("related_ids")
    @classmethod
    def validate_related_ids(cls, v: List[str]) -> List[str]:
        unique = list(set(v))
        if len(unique) < 2:
            raise ValueError("related_ids must have at least 2 unique items")
        return unique

    def to_mongo(self) -> dict:
        """Convert to MongoDB document format."""
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: dict) -> "MultitaskingGroupSchema":
        """Convert from MongoDB document format."""
        if data is None:
            return None
        if "_id" in data and "id" not in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> MultitaskingGroup:
        """Convert to core domain model."""
        return MultitaskingGroup(
            id=self.id or "",
            type=MultitaskingGroupType(self.type),
            team_id=self.team_id,
            related_ids=list(self.related_ids),
            shift_demand_template_id=self.shift_demand_template_id,
            created_at=datetime.fromtimestamp(
                self.created_at, tz=timezone.utc
            ),
            updated_at=datetime.fromtimestamp(
                self.updated_at, tz=timezone.utc
            ),
            notes=self.notes,
        )

    @classmethod
    def from_core(cls, group: MultitaskingGroup) -> "MultitaskingGroupSchema":
        """Convert from core domain model."""
        return cls(
            id=group.id,
            type=group.type.value,
            team_id=group.team_id,
            related_ids=list(group.related_ids),
            shift_demand_template_id=group.shift_demand_template_id,
            created_at=group.created_at.timestamp(),
            updated_at=group.updated_at.timestamp(),
            notes=group.notes,
        )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "group_123",
                "type": "shift_demand_template",
                "team_id": "team_456",
                "related_ids": ["demand_1", "demand_2"],
                "shift_demand_template_id": "template_789",
                "created_at": 1718900000.0,
                "updated_at": 1718903600.0,
                "notes": "Example multitasking group for template.",
            }
        }
    )
