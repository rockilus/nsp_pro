from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)


class ShiftDemandTemplateSchema(DocumentBaseSchema):
    """ShiftDemandTemplate schema for validation."""

    name: str
    team: str
    template_type: str
    weeks_data: List[Dict[str, Any]]
    description: Optional[str] = None
    created_by: str
    created_at: float
    updated_at: float

    @field_validator("template_type")
    @classmethod
    def validate_template_type(cls, v: str) -> str:
        """Validate template_type is a valid enum value."""
        if v not in [template_type.value for template_type in TemplateType]:
            raise ValueError(f"Invalid template type: {v}")
        return v

    @field_validator("weeks_data")
    @classmethod
    def validate_weeks_data(cls, v: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate weeks_data structure."""
        if not v:
            raise ValueError("Template must have at least one week of data")

        for week_data in v:
            if "week_number" not in week_data:
                raise ValueError("Week data must contain week_number")
            if "demands" not in week_data:
                raise ValueError("Week data must contain demands")

            # Validate demands structure
            demands = week_data["demands"]
            if not isinstance(demands, dict):
                raise ValueError("Week demands must be a dictionary")

            for _, daily_demands in demands.items():
                if not isinstance(daily_demands, list):
                    raise ValueError("Daily demands must be a list")
                if len(daily_demands) != 7:
                    raise ValueError("Daily demands must contain exactly 7 days")
                if not all(
                    isinstance(count, int) and count >= 0 for count in daily_demands
                ):
                    raise ValueError("All demand counts must be non-negative integers")

        return v

    def to_mongo(self) -> Dict[str, Any]:
        """Convert to MongoDB document format."""
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ShiftDemandTemplateSchema":
        """Convert from MongoDB document format."""
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> ShiftDemandTemplate:
        """Convert to core domain model."""
        weeks_data = [
            TemplateWeekData(
                week_number=week_data["week_number"],
                demands=week_data["demands"],
            )
            for week_data in self.weeks_data
        ]

        return ShiftDemandTemplate(
            id=self.id or "",
            name=self.name,
            team_id=self.team,
            template_type=TemplateType(self.template_type),
            weeks_data=weeks_data,
            description=self.description,
            created_by=self.created_by,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            updated_at=datetime.fromtimestamp(self.updated_at, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, template: ShiftDemandTemplate) -> "ShiftDemandTemplateSchema":
        """Convert from core domain model."""
        weeks_data = [
            {"week_number": week.week_number, "demands": week.demands}
            for week in template.weeks_data
        ]

        return cls(
            id=template.id,
            name=template.name,
            team=template.team_id,
            template_type=template.template_type.value,
            weeks_data=weeks_data,
            description=template.description,
            created_by=template.created_by,
            created_at=template.created_at.timestamp(),
            updated_at=template.updated_at.timestamp(),
        )
