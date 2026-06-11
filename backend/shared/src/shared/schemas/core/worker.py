from dataclasses import asdict, dataclass, field
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.attribute import Attribute
from shared.schemas.dto.worker import WorkerDTO


class WeekParity(Enum):
    ALL = "all"
    EVEN = "even"
    ODD = "odd"


class SlotRestriction(Enum):
    NO_WORK = "no_work"
    NO_NORMAL = "no_normal"
    NO_DUTY = "no_duty"
    NO_SPECIFIC = "no_specific"


@dataclass
class WeeklySlotPreference:
    day_of_week: int  # 0=Monday … 6=Sunday
    slot: str  # "morning" | "afternoon" | "night"
    restriction: SlotRestriction
    shift_ids: List[str] = field(default_factory=list)
    week_parity: WeekParity = WeekParity.ALL

    def to_dict(self) -> Dict:
        return {
            "day_of_week": self.day_of_week,
            "slot": self.slot,
            "restriction": self.restriction.value,
            "shift_ids": self.shift_ids,
            "week_parity": self.week_parity.value,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "WeeklySlotPreference":
        return cls(
            day_of_week=data["day_of_week"],
            slot=data["slot"],
            restriction=SlotRestriction(data["restriction"]),
            shift_ids=data.get("shift_ids", []),
            week_parity=WeekParity(data.get("week_parity", "all")),
        )


@dataclass
class WeeklyPreferences:
    enabled: bool = False
    slots: List[WeeklySlotPreference] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "enabled": self.enabled,
            "slots": [slot.to_dict() for slot in self.slots],
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "WeeklyPreferences":
        return cls(
            enabled=data.get("enabled", False),
            slots=[
                WeeklySlotPreference.from_dict(s)
                for s in data.get("slots", [])
            ],
        )


# pylint: disable=too-many-instance-attributes
@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    acronym: str
    acronym_custom: bool
    employment_start_date: date
    employment_end_date: date | None
    weekly_hours: int  # in hours, contract
    weekly_hours_desired: int  # in hours, desired
    duties_per_month: int  # number of duties per month
    annual_leave: int  # in days
    specialty_ids: List[str]
    deleted: bool
    weekly_preferences: WeeklyPreferences | None = None
    user_id: str | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["employment_start_date"] = datetime.combine(
            self.employment_start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["employment_end_date"] = (
            datetime.combine(
                self.employment_end_date, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.employment_end_date
            else None
        )
        out["weekly_preferences"] = (
            self.weekly_preferences.to_dict()
            if self.weekly_preferences
            else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Worker":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            name=data["name"],
            acronym=data["acronym"],
            acronym_custom=data["acronym_custom"],
            employment_start_date=datetime.fromtimestamp(
                data["employment_start_date"], timezone.utc
            ).date(),
            employment_end_date=(
                datetime.fromtimestamp(
                    data["employment_end_date"], timezone.utc
                ).date()
                if data["employment_end_date"]
                else None
            ),
            weekly_hours=data["weekly_hours"],
            weekly_hours_desired=data["weekly_hours_desired"],
            duties_per_month=data["duties_per_month"],
            annual_leave=data["annual_leave"],
            specialty_ids=data["specialty_ids"],
            deleted=data["deleted"],
            weekly_preferences=(
                WeeklyPreferences.from_dict(data["weekly_preferences"])
                if data.get("weekly_preferences")
                else None
            ),
            user_id=data.get("user_id", None),
        )

    def to_dto(self, attributes: List[Attribute]) -> WorkerDTO:
        data = asdict(self)
        data["employment_start_date"] = datetime.combine(
            self.employment_start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["employment_end_date"] = (
            datetime.combine(
                self.employment_end_date, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.employment_end_date
            else None
        )
        data["attributes"] = [attr.to_dict() for attr in attributes]
        data["weekly_preferences"] = (
            self.weekly_preferences.to_dict()
            if self.weekly_preferences
            else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(WorkerDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: WorkerDTO) -> "Worker":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["employment_start_date"] = datetime.fromtimestamp(
            data_dict["employment_start_date"], tz=timezone.utc
        ).date()
        data_dict["employment_end_date"] = (
            datetime.fromtimestamp(
                data_dict["employment_end_date"], tz=timezone.utc
            ).date()
            if data_dict["employment_end_date"]
            else None
        )
        data_dict.pop("attributes", None)

        # WeeklyPreferences comes from the DTO as a nested camelCase dict;
        # humps.decamelize only flattens top-level keys, so we manually
        # decamelize the nested structure before delegating to from_dict.
        wp_raw = data_dict.pop("weekly_preferences", None)
        if wp_raw is not None:
            wp_decamelized = humps.decamelize(wp_raw)
            if wp_decamelized.get("slots"):
                wp_decamelized["slots"] = [
                    humps.decamelize(s) for s in wp_decamelized["slots"]
                ]
            data_dict["weekly_preferences"] = WeeklyPreferences.from_dict(
                wp_decamelized
            )

        return cls(**data_dict)


@dataclass
class WorkerDates:
    dates_hist: List[date]
    dates_campaign: List[date]
