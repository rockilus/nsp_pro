from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import humps
from pydantic import TypeAdapter

from shared.schemas.core.shift_demand_template import TemplateType
from shared.schemas.dto.schedule_template import (
    ScheduleTemplateCreateDTO,
    ScheduleTemplateDTO,
    ScheduleTemplateUpdateDTO,
)

WEEKDAYS = 7
EPOCH_MONDAY_REFERENCE = date(1970, 1, 5)
MAX_DATE_RANGE_DAYS = 365
MAX_TEMPLATE_WEEKS = 8
EVEN_ODD_WEEKS = 2


@dataclass
class ScheduleTemplateEntry:
    shift_id: str
    day_of_week: int
    demand_count: int = 0
    worker_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduleTemplateEntry":
        return cls(
            shift_id=data["shift_id"],
            day_of_week=data["day_of_week"],
            demand_count=data.get("demand_count", 0),
            worker_ids=data.get("worker_ids", []),
        )


@dataclass
class ScheduleTemplateWeekData:
    week_number: int
    entries: List[ScheduleTemplateEntry]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduleTemplateWeekData":
        entries = [ScheduleTemplateEntry.from_dict(e) for e in data["entries"]]
        return cls(week_number=data["week_number"], entries=entries)


@dataclass
class ScheduleTemplate:
    name: str
    team_id: str
    template_type: TemplateType
    weeks_data: List[ScheduleTemplateWeekData]
    description: Optional[str] = None
    created_by: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None

    def __post_init__(self):
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Template name is required")

        if len(self.name) > 100:
            raise ValueError("Template name must be 100 characters or less")

        if self.description and len(self.description) > 500:
            raise ValueError("Template description must be 500 characters or less")

        if not self.weeks_data:
            raise ValueError("Template must have at least one week of data")

        self.weeks_data = self._normalize_weeks_data(self.weeks_data)

        if self.template_type == TemplateType.EVEN_ODD:
            if len(self.weeks_data) != EVEN_ODD_WEEKS:
                raise ValueError("Even/odd templates must have exactly 2 weeks")
        elif self.template_type == TemplateType.STANDARD:
            if len(self.weeks_data) < 1 or len(self.weeks_data) > MAX_TEMPLATE_WEEKS:
                raise ValueError("Standard templates must have 1-8 weeks")

        expected_weeks = set(range(len(self.weeks_data)))
        actual_weeks = {week.week_number for week in self.weeks_data}
        if expected_weeks != actual_weeks:
            raise ValueError("Week numbers must be consecutive starting from 0")

    def _normalize_weeks_data(
        self, weeks_data: List[ScheduleTemplateWeekData]
    ) -> List[ScheduleTemplateWeekData]:
        normalized_weeks: List[ScheduleTemplateWeekData] = []

        for week in weeks_data:
            entry_groups: Dict[Tuple[str, int], Dict[str, Any]] = {}

            for entry in week.entries:
                if entry.day_of_week < 0 or entry.day_of_week > 6:
                    raise ValueError("Day of week must be between 0 and 6")
                if entry.demand_count < 0:
                    raise ValueError("Demand count must be non-negative")

                key = (entry.shift_id, entry.day_of_week)
                if key not in entry_groups:
                    entry_groups[key] = {"demand_count": 0, "worker_ids": set()}

                entry_groups[key]["demand_count"] += entry.demand_count
                entry_groups[key]["worker_ids"].update(entry.worker_ids)

            consolidated_entries: List[ScheduleTemplateEntry] = []
            for (shift_id, day_of_week), data in sorted(entry_groups.items()):
                worker_list = sorted(data["worker_ids"])
                if data["demand_count"] > 0 or worker_list:
                    consolidated_entries.append(
                        ScheduleTemplateEntry(
                            shift_id=shift_id,
                            day_of_week=day_of_week,
                            demand_count=data["demand_count"],
                            worker_ids=worker_list,
                        )
                    )

            normalized_weeks.append(
                ScheduleTemplateWeekData(
                    week_number=week.week_number, entries=consolidated_entries
                )
            )

        return normalized_weeks

    @property
    def week_count(self) -> int:
        return len(self.weeks_data)

    def to_dict(self) -> Dict[str, Any]:
        out = asdict(self)
        out["template_type"] = self.template_type.value
        out["created_at"] = self.created_at.timestamp()
        out["updated_at"] = self.updated_at.timestamp()
        out["weeks_data"] = [week.to_dict() for week in self.weeks_data]
        return out

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduleTemplate":
        data["template_type"] = TemplateType(data["template_type"])
        data["created_at"] = datetime.fromtimestamp(data["created_at"], tz=timezone.utc)
        data["updated_at"] = datetime.fromtimestamp(data["updated_at"], tz=timezone.utc)
        data["weeks_data"] = [
            ScheduleTemplateWeekData.from_dict(w) for w in data["weeks_data"]
        ]
        return cls(**data)

    def update_timestamp(self):
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> ScheduleTemplateDTO:
        data = asdict(self)
        data["template_type"] = self.template_type.value
        data["created_at"] = self.created_at.timestamp()
        data["updated_at"] = self.updated_at.timestamp()
        if data["id"] is None:
            data["id"] = ""
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ScheduleTemplateDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_create_dto(
        cls,
        data: ScheduleTemplateCreateDTO,
        created_by: str,
        team_id: str,
        template_type: TemplateType,
        weeks_data: List[ScheduleTemplateWeekData],
    ) -> "ScheduleTemplate":
        now = datetime.now(timezone.utc)
        return cls(
            name=data.name,
            description=data.description,
            team_id=team_id,
            template_type=template_type,
            weeks_data=weeks_data,
            created_by=created_by,
            created_at=now,
            updated_at=now,
            id=None,
        )

    def update_from_dto(self, data: ScheduleTemplateUpdateDTO) -> None:
        data_dict = data.model_dump(exclude_unset=True)

        if "name" in data_dict:
            self.name = data_dict["name"]

        if "description" in data_dict:
            self.description = data_dict["description"]

        if "templateType" in data_dict:
            self.template_type = TemplateType(data_dict["templateType"])

        if "weeksData" in data_dict:
            weeks_data: List[ScheduleTemplateWeekData] = []
            for week_dto in data_dict["weeksData"]:
                if not isinstance(week_dto, dict):
                    continue
                if "entries" not in week_dto or "weekNumber" not in week_dto:
                    continue

                entries_data = week_dto["entries"]
                if not isinstance(entries_data, list):
                    continue

                entry_list: List[ScheduleTemplateEntry] = []
                for entry in entries_data:
                    if not isinstance(entry, dict):
                        continue
                    required_fields = ["shiftId", "dayOfWeek"]
                    if not all(f in entry for f in required_fields):
                        continue
                    try:
                        entry_list.append(
                            ScheduleTemplateEntry(
                                shift_id=entry["shiftId"],
                                day_of_week=entry["dayOfWeek"],
                                demand_count=entry.get("demandCount", 0),
                                worker_ids=entry.get("workerIds", []),
                            )
                        )
                    except ValueError, TypeError:
                        continue

                try:
                    weeks_data.append(
                        ScheduleTemplateWeekData(
                            week_number=week_dto["weekNumber"],
                            entries=entry_list,
                        )
                    )
                except ValueError, TypeError:
                    continue

            self.weeks_data = self._normalize_weeks_data(weeks_data)

        self.update_timestamp()


def _calculate_template_application_mapping(
    template: ScheduleTemplate,
    start_date: date,
    end_date: date,
    start_week_number: int = 0,
) -> List[Tuple[date, int, int]]:
    mappings: List[Tuple[date, int, int]] = []
    current_date = start_date
    week_cycle_length = len(template.weeks_data)

    if template.template_type == TemplateType.STANDARD:
        if start_week_number < 0 or start_week_number >= week_cycle_length:
            raise ValueError(
                f"start_week_number {start_week_number} out of range "
                f"(0-{week_cycle_length - 1})"
            )
        template_week = start_week_number
    elif template.template_type == TemplateType.EVEN_ODD:
        start_monday = current_date - timedelta(days=current_date.weekday())
        days_since_epoch = (start_monday - EPOCH_MONDAY_REFERENCE).days
        iso_week = days_since_epoch // 7
        template_week = 0 if iso_week % 2 == 0 else 1

    while current_date <= end_date:
        template_day = current_date.weekday()
        mappings.append((current_date, template_week, template_day))

        current_date += timedelta(days=1)

        if current_date.weekday() == 0:
            if template.template_type == TemplateType.STANDARD:
                template_week = (template_week + 1) % week_cycle_length
            elif template.template_type == TemplateType.EVEN_ODD:
                template_week = 1 - template_week

    return mappings


def generate_demands_from_template(
    template: ScheduleTemplate,
    start_date: date,
    end_date: date,
    team_id: str,
    template_id: str,
    start_week_number: int = 0,
) -> List[Dict[str, Any]]:
    if start_date > end_date:
        raise ValueError("End date must be after or equal to start date")

    if (end_date - start_date).days > MAX_DATE_RANGE_DAYS:
        raise ValueError("Date range cannot exceed 365 days")

    mappings = _calculate_template_application_mapping(
        template, start_date, end_date, start_week_number
    )

    demands: List[Dict[str, Any]] = []

    for target_date, template_week, template_day in mappings:
        week_data = next(
            (w for w in template.weeks_data if w.week_number == template_week),
            None,
        )
        if not week_data:
            continue

        day_entries = [e for e in week_data.entries if e.day_of_week == template_day]

        for entry in day_entries:
            if entry.demand_count > 0:
                demands.append(
                    {
                        "date": target_date,
                        "shift_id": entry.shift_id,
                        "count": entry.demand_count,
                        "team_id": team_id,
                        "source_id": template_id,
                    }
                )

    return demands


def generate_assignments_from_template(
    template: ScheduleTemplate,
    start_date: date,
    end_date: date,
    team_id: str,
    template_id: str,
    start_week_number: int = 0,
) -> List[Dict[str, Any]]:
    if start_date > end_date:
        raise ValueError("End date must be after or equal to start date")

    if (end_date - start_date).days > MAX_DATE_RANGE_DAYS:
        raise ValueError("Date range cannot exceed 365 days")

    mappings = _calculate_template_application_mapping(
        template, start_date, end_date, start_week_number
    )

    assignments: List[Dict[str, Any]] = []

    for target_date, template_week, template_day in mappings:
        week_data = next(
            (w for w in template.weeks_data if w.week_number == template_week),
            None,
        )
        if not week_data:
            continue

        day_entries = [e for e in week_data.entries if e.day_of_week == template_day]

        for entry in day_entries:
            for worker_id in entry.worker_ids:
                if worker_id:
                    assignments.append(
                        {
                            "date": target_date,
                            "shift_id": entry.shift_id,
                            "worker_id": worker_id,
                            "team_id": team_id,
                            "source_id": template_id,
                        }
                    )

    return assignments
