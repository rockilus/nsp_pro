from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import humps
from pydantic import TypeAdapter

from shared.schemas.core.shift_demand_template import TemplateType
from shared.schemas.dto.assignment_template import (
    AssignmentTemplateCreateDTO,
    AssignmentTemplateDTO,
    AssignmentTemplateUpdateDTO,
)


@dataclass
class AssignmentTemplateEntry:
    shift_id: str
    day_of_week: int
    worker_ids: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AssignmentTemplateEntry":
        return cls(**data)


@dataclass
class AssignmentTemplateWeekData:
    week_number: int
    entries: List[AssignmentTemplateEntry]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AssignmentTemplateWeekData":
        entries = [AssignmentTemplateEntry.from_dict(e) for e in data["entries"]]
        return cls(week_number=data["week_number"], entries=entries)


@dataclass
class AssignmentTemplate:
    name: str
    team_id: str
    template_type: TemplateType
    weeks_data: List[AssignmentTemplateWeekData]
    description: Optional[str] = None
    created_by: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None

    # pylint: disable=too-many-branches
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
            if len(self.weeks_data) != 2:
                raise ValueError("Even/odd templates must have exactly 2 weeks")
        elif self.template_type == TemplateType.STANDARD:
            if len(self.weeks_data) < 1 or len(self.weeks_data) > 8:
                raise ValueError("Standard templates must have 1-8 weeks")

        expected_weeks = set(range(len(self.weeks_data)))
        actual_weeks = {week.week_number for week in self.weeks_data}
        if expected_weeks != actual_weeks:
            raise ValueError("Week numbers must be consecutive starting from 0")

    def _normalize_weeks_data(
        self, weeks_data: List[AssignmentTemplateWeekData]
    ) -> List[AssignmentTemplateWeekData]:
        normalized_weeks: List[AssignmentTemplateWeekData] = []

        for week in weeks_data:
            entry_groups: Dict[Tuple[str, int], set] = {}

            for entry in week.entries:
                if entry.day_of_week < 0 or entry.day_of_week > 6:
                    raise ValueError("Day of week must be between 0 and 6")
                if not entry.worker_ids:
                    continue

                key = (entry.shift_id, entry.day_of_week)
                if key not in entry_groups:
                    entry_groups[key] = set()
                entry_groups[key].update(entry.worker_ids)

            consolidated_entries: List[AssignmentTemplateEntry] = []
            for (shift_id, day_of_week), worker_set in entry_groups.items():
                worker_list = sorted(worker_set)
                if worker_list:
                    consolidated_entries.append(
                        AssignmentTemplateEntry(
                            shift_id=shift_id,
                            day_of_week=day_of_week,
                            worker_ids=worker_list,
                        )
                    )

            consolidated_entries.sort(key=lambda e: (e.shift_id, e.day_of_week))

            normalized_weeks.append(
                AssignmentTemplateWeekData(
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
    def from_dict(cls, data: Dict[str, Any]) -> "AssignmentTemplate":
        data["template_type"] = TemplateType(data["template_type"])
        data["created_at"] = datetime.fromtimestamp(data["created_at"], tz=timezone.utc)
        data["updated_at"] = datetime.fromtimestamp(data["updated_at"], tz=timezone.utc)
        data["weeks_data"] = [
            AssignmentTemplateWeekData.from_dict(w) for w in data["weeks_data"]
        ]
        return cls(**data)

    def update_timestamp(self):
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> AssignmentTemplateDTO:
        data = asdict(self)
        data["template_type"] = self.template_type.value
        data["created_at"] = self.created_at.timestamp()
        data["updated_at"] = self.updated_at.timestamp()
        if data["id"] is None:
            data["id"] = ""
        as_dict = humps.camelize(data)
        validator = TypeAdapter(AssignmentTemplateDTO)
        return validator.validate_python(as_dict)

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    @classmethod
    def from_create_dto(
        cls,
        data: AssignmentTemplateCreateDTO,
        created_by: str,
        team_id: str,
        template_type: TemplateType,
        weeks_data: List[AssignmentTemplateWeekData],
    ) -> "AssignmentTemplate":
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

    def update_from_dto(self, data: AssignmentTemplateUpdateDTO) -> None:
        data_dict = data.model_dump(exclude_unset=True)

        if "name" in data_dict:
            self.name = data_dict["name"]

        if "description" in data_dict:
            self.description = data_dict["description"]

        if "templateType" in data_dict:
            self.template_type = TemplateType(data_dict["templateType"])

        if "weeksData" in data_dict:
            weeks_data: List[AssignmentTemplateWeekData] = []
            for week_dto in data_dict["weeksData"]:
                if not isinstance(week_dto, dict):
                    continue
                if "entries" not in week_dto or "weekNumber" not in week_dto:
                    continue

                entries_data = week_dto["entries"]
                if not isinstance(entries_data, list):
                    continue

                entry_list: List[AssignmentTemplateEntry] = []
                for entry in entries_data:
                    if not isinstance(entry, dict):
                        continue
                    required_fields = ["shiftId", "dayOfWeek", "workerIds"]
                    if not all(f in entry for f in required_fields):
                        continue
                    try:
                        entry_list.append(
                            AssignmentTemplateEntry(
                                shift_id=entry["shiftId"],
                                day_of_week=entry["dayOfWeek"],
                                worker_ids=entry["workerIds"],
                            )
                        )
                    except ValueError, TypeError:
                        continue

                try:
                    weeks_data.append(
                        AssignmentTemplateWeekData(
                            week_number=week_dto["weekNumber"],
                            entries=entry_list,
                        )
                    )
                except ValueError, TypeError:
                    continue

            self.weeks_data = self._normalize_weeks_data(weeks_data)

        self.update_timestamp()


def create_template_from_assignments(
    name: str,
    team_id: str,
    template_type: TemplateType,
    assignments: List[Dict[str, Any]],
    created_by: str,
    description: Optional[str] = None,
) -> AssignmentTemplate:
    if not assignments:
        raise ValueError("Cannot create template from empty assignments")

    sorted_assignments = sorted(assignments, key=lambda x: x["date"])
    start_date = sorted_assignments[0]["date"]

    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    elif isinstance(start_date, (int, float)):
        start_date = datetime.fromtimestamp(start_date, tz=timezone.utc).date()

    days_since_monday = start_date.weekday()
    week_start = start_date - timedelta(days=days_since_monday)

    weeks_data: Dict[int, Dict[Tuple[str, int], set]] = {}

    for a in assignments:
        a_date = a["date"]
        if isinstance(a_date, str):
            a_date = datetime.strptime(a_date, "%Y-%m-%d").date()
        elif isinstance(a_date, (int, float)):
            a_date = datetime.fromtimestamp(a_date, tz=timezone.utc).date()

        days_diff = (a_date - week_start).days
        week_num = days_diff // 7
        day_of_week = days_diff % 7

        expected_weeks = 2 if template_type == TemplateType.EVEN_ODD else 8
        if week_num >= expected_weeks:
            continue

        if week_num not in weeks_data:
            weeks_data[week_num] = {}

        key = (a["shift_id"], day_of_week)
        if key not in weeks_data[week_num]:
            weeks_data[week_num][key] = set()
        weeks_data[week_num][key].add(a["worker_id"])

    template_weeks: List[AssignmentTemplateWeekData] = []
    for week_num in sorted(weeks_data.keys()):
        entries: List[AssignmentTemplateEntry] = []
        for (shift_id, dow), worker_set in weeks_data[week_num].items():
            entries.append(
                AssignmentTemplateEntry(
                    shift_id=shift_id,
                    day_of_week=dow,
                    worker_ids=sorted(worker_set),
                )
            )
        template_weeks.append(
            AssignmentTemplateWeekData(week_number=week_num, entries=entries)
        )

    return AssignmentTemplate(
        name=name,
        team_id=team_id,
        template_type=template_type,
        weeks_data=template_weeks,
        description=description,
        created_by=created_by,
    )


def _calculate_template_application_mapping(
    template: AssignmentTemplate,
    start_date: date,
    end_date: date,
) -> List[Tuple[date, int, int]]:
    mappings: List[Tuple[date, int, int]] = []
    current_date = start_date
    week_cycle_length = len(template.weeks_data)

    if template.template_type == TemplateType.STANDARD:
        template_week = 0
    elif template.template_type == TemplateType.EVEN_ODD:
        start_monday = current_date - timedelta(days=current_date.weekday())
        days_since_epoch = (start_monday - date(1970, 1, 5)).days
        week_number = days_since_epoch // 7
        template_week = 0 if week_number % 2 == 0 else 1

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


def apply_template_to_date_range(
    template: AssignmentTemplate,
    start_date: date,
    end_date: date,
    team_id: str,
    shift_id_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if start_date > end_date:
        raise ValueError("End date must be after or equal to start date")

    if (end_date - start_date).days > 365:
        raise ValueError("Date range cannot exceed 365 days")

    mappings = _calculate_template_application_mapping(template, start_date, end_date)

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
            if shift_id_filter and entry.shift_id != shift_id_filter:
                continue
            for worker_id in entry.worker_ids:
                if worker_id:
                    assignments.append(
                        {
                            "date": target_date,
                            "shift_id": entry.shift_id,
                            "worker_id": worker_id,
                            "team_id": team_id,
                        }
                    )

    return assignments
