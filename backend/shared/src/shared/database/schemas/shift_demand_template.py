from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.shift_demand_template import (
    DemandEntry,
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

    # pylint: disable=too-many-branches
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

            # Validate demands structure (list of demand entries)
            demands = week_data["demands"]
            if not isinstance(demands, list):
                raise ValueError("Week demands must be a list")

            for demand_entry in demands:
                if not isinstance(demand_entry, dict):
                    raise ValueError("Demand entry must be a dictionary")

                required_fields = ["shift_id", "day_of_week", "count"]
                for field in required_fields:
                    if field not in demand_entry:
                        raise ValueError(f"Demand entry must contain {field}")

                if not isinstance(demand_entry["day_of_week"], int):
                    raise ValueError("day_of_week must be an integer")
                if not 0 <= demand_entry["day_of_week"] <= 6:
                    raise ValueError("day_of_week must be between 0 and 6")

                if not isinstance(demand_entry["count"], int):
                    raise ValueError("count must be an integer")
                if demand_entry["count"] < 0:
                    raise ValueError("count must be non-negative")

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
        weeks_data: List[TemplateWeekData] = []
        for week_data in self.weeks_data:
            demand_entries = [
                DemandEntry(
                    shift_id=entry["shift_id"],
                    day_of_week=entry["day_of_week"],
                    count=entry["count"],
                )
                for entry in week_data["demands"]
            ]
            weeks_data.append(
                TemplateWeekData(
                    week_number=week_data["week_number"],
                    demands=demand_entries,
                )
            )

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
        weeks_data: List[Dict[str, Any]] = []
        for week in template.weeks_data:
            demand_entries = [
                {
                    "shift_id": entry.shift_id,
                    "day_of_week": entry.day_of_week,
                    "count": entry.count,
                }
                for entry in week.demands
            ]
            weeks_data.append(
                {"week_number": week.week_number, "demands": demand_entries}
            )

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
