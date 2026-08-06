from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.schedule_template import (
    ScheduleTemplate,
    ScheduleTemplateEntry,
    ScheduleTemplateWeekData,
)
from shared.schemas.core.shift_demand_template import TemplateType


class ScheduleTemplateSchema(DocumentBaseSchema):
    name: str
    team: str
    template_type: str
    weeks_data: List[Dict[str, Any]]
    scope_shift_ids: list[str] = []
    include_all_work_shifts: bool = True
    description: Optional[str] = None
    created_by: str
    created_at: float
    updated_at: float

    @field_validator("template_type")
    @classmethod
    def validate_template_type(cls, v: str) -> str:
        if v not in [t.value for t in TemplateType]:
            raise ValueError(f"Invalid template type: {v}")
        return v

    @field_validator("weeks_data")
    @classmethod
    def validate_weeks_data(cls, v: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not v:
            raise ValueError("Template must have at least one week of data")

        for week_data in v:
            if "week_number" not in week_data:
                raise ValueError("Week data must contain week_number")
            if "entries" not in week_data:
                raise ValueError("Week data must contain entries")

            entries = week_data["entries"]
            if not isinstance(entries, list):
                raise ValueError("Week entries must be a list")

            for entry in entries:
                if not isinstance(entry, dict):
                    raise ValueError("Template entry must be a dictionary")

                required_fields = ["shift_id", "day_of_week"]
                for field_name in required_fields:
                    if field_name not in entry:
                        raise ValueError(f"Entry must contain {field_name}")

                if not isinstance(entry["day_of_week"], int):
                    raise ValueError("day_of_week must be an integer")
                if not 0 <= entry["day_of_week"] <= 6:
                    raise ValueError("day_of_week must be between 0 and 6")

                if not isinstance(entry.get("demand_count", 0), int):
                    raise ValueError("demand_count must be an integer")
                if entry.get("demand_count", 0) < 0:
                    raise ValueError("demand_count must be non-negative")

                if not isinstance(entry.get("worker_ids", []), list):
                    raise ValueError("worker_ids must be a list")

        return v

    def to_mongo(self) -> Dict[str, Any]:
        return super().to_mongo()

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ScheduleTemplateSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> ScheduleTemplate:
        weeks_data: List[ScheduleTemplateWeekData] = []
        for week_data in self.weeks_data:
            entries = [
                ScheduleTemplateEntry(
                    shift_id=e["shift_id"],
                    day_of_week=e["day_of_week"],
                    demand_count=e.get("demand_count", 0),
                    worker_ids=e.get("worker_ids", []),
                )
                for e in week_data["entries"]
            ]
            weeks_data.append(
                ScheduleTemplateWeekData(
                    week_number=week_data["week_number"],
                    entries=entries,
                )
            )

        return ScheduleTemplate(
            id=self.id or "",
            name=self.name,
            team_id=self.team,
            template_type=TemplateType(self.template_type),
            weeks_data=weeks_data,
            scope_shift_ids=self.scope_shift_ids,
            include_all_work_shifts=self.include_all_work_shifts,
            description=self.description,
            created_by=self.created_by,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            updated_at=datetime.fromtimestamp(self.updated_at, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, template: ScheduleTemplate) -> "ScheduleTemplateSchema":
        weeks_data: List[Dict[str, Any]] = []
        for week in template.weeks_data:
            entries = [
                {
                    "shift_id": e.shift_id,
                    "day_of_week": e.day_of_week,
                    "demand_count": e.demand_count,
                    "worker_ids": e.worker_ids,
                }
                for e in week.entries
            ]
            weeks_data.append({"week_number": week.week_number, "entries": entries})

        return cls(
            id=template.id,
            name=template.name,
            team=template.team_id,
            template_type=template.template_type.value,
            weeks_data=weeks_data,
            scope_shift_ids=template.scope_shift_ids,
            include_all_work_shifts=template.include_all_work_shifts,
            description=template.description,
            created_by=template.created_by,
            created_at=template.created_at.timestamp(),
            updated_at=template.updated_at.timestamp(),
        )
