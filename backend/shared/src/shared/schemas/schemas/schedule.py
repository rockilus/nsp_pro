from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List


@dataclass
class Assignment:
    id: str
    team_id: str
    schedule_id: str | None
    worker_id: str
    date: date
    shift_id: str
    fixed: bool

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Assignment":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            schedule_id=data["schedule_id"],
            worker_id=data["worker_id"],
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            fixed=data["fixed"],
        )


@dataclass
class Variable:
    worker_id: str | None
    date: date
    shift_id: str

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Variable":
        return cls(
            worker_id=data["worker_id"],
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
        )


class ObjectiveCategory(Enum):
    CONSTRAINT = 0
    REQUEST = 1
    DAILY_SHIFT_DEMAND = 2
    DAILY_SHIFT_DEMAND_SPE = 3
    WORK_TIME_CONTRACT = 4
    WORK_TIME_DESIRED = 5
    DUTIES_PER_MONTH = 6
    LINK_SHIFT = 7
    DUTY_RECUP = 8


# pylint: disable=R0801
@dataclass
class Breach:
    id: str
    schedule_id: str
    objective_id: str | None
    objective_category: ObjectiveCategory
    variables: List[Variable]
    description: str
    hard_to_soft: bool | None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["objective_category"] = self.objective_category.value
        out["variables"] = [var.to_dict() for var in self.variables]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Breach":
        return cls(
            id=data["id"],
            schedule_id=data["schedule_id"],
            objective_id=data["objective_id"],
            objective_category=ObjectiveCategory(data["objective_category"]),
            variables=[Variable.from_dict(var) for var in data["variables"]],
            description=data["description"],
            hard_to_soft=data["hard_to_soft"],
        )


@dataclass
class QuickStaffing:
    worker_id: str
    shift_id: str
    target: int


class ScheduleSolveStatus(Enum):
    NOT_SOLVED = 0
    SOLVED = 1
    HARD_BREACHED = 2
    SOFT_BREACHED = 3
    NO_SOLUTION = 4


class ScheduleStatus(Enum):
    CAMPAIGN = 0
    VALIDATED = 1


class SolveDetailsStatus(Enum):
    PENDING = 0
    STARTED = 1
    RETRY = 2
    FAILURE = 3
    SUCCESS = 4


@dataclass
class SolveDetails:
    task_id: str
    status: SolveDetailsStatus
    updated_at: datetime
    result: Dict | None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["updated_at"] = self.updated_at.timestamp()
        out["status"] = self.status.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "SolveDetails":
        return cls(
            task_id=data["task_id"],
            status=SolveDetailsStatus(data["status"]),
            updated_at=datetime.fromtimestamp(data["updated_at"], tz=timezone.utc),
            result=data["result"],
        )


# pylint: disable=too-many-instance-attributes
@dataclass
class Schedule:
    id: str
    team_id: str
    start_date: date
    end_date: date
    last_modified_dates: datetime
    solve_details: SolveDetails | None
    solve_status: ScheduleSolveStatus
    status: ScheduleStatus
    missing_coverage_dates: List[date]
    constraint_build_ids: List[str]
    quick_staffings: List[QuickStaffing]
    last_updated_dsds: datetime | None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["last_modified_dates"] = self.last_modified_dates.timestamp()
        if self.solve_details:
            out["solve_details"] = self.solve_details.to_dict()
        out["solve_status"] = self.solve_status.value
        out["status"] = self.status.value
        out["missing_coverage_dates"] = [
            datetime.combine(dt, time.min, tzinfo=timezone.utc).timestamp()
            for dt in self.missing_coverage_dates
        ]
        out["last_updated_dsds"] = (
            self.last_updated_dsds.timestamp()
            if self.last_updated_dsds is not None
            else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Schedule":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            start_date=datetime.fromtimestamp(data["start_date"], timezone.utc).date(),
            end_date=datetime.fromtimestamp(data["end_date"], timezone.utc).date(),
            last_modified_dates=datetime.fromtimestamp(
                data["last_modified_dates"], timezone.utc
            ),
            solve_details=(
                SolveDetails.from_dict(data["solve_details"])
                if data.get("solve_details", None) is not None
                else None
            ),
            solve_status=ScheduleSolveStatus(data["solve_status"]),
            status=ScheduleStatus(data["status"]),
            missing_coverage_dates=[
                datetime.fromtimestamp(ts, timezone.utc).date()
                for ts in data["missing_coverage_dates"]
            ],
            constraint_build_ids=data["constraint_build_ids"],
            quick_staffings=[QuickStaffing(**qs) for qs in data["quick_staffings"]],
            last_updated_dsds=(
                datetime.fromtimestamp(data["last_updated_dsds"], timezone.utc)
                if data.get("last_updated_dsds", None) is not None
                else None
            ),
        )


@dataclass
class WorkTimeTableData:
    hours: int
    count: int


@dataclass
class WorkTimeTable:
    duties: WorkTimeTableData
    others: WorkTimeTableData
    workers: WorkTimeTableData
    nb_weeks: float


# @dataclass
# class Worker:
#     id: str
#     name: str
#     max_weekly_hours: int
#     max_consecutive_shifts: int
#     min_consecutive_days_off: int
#     max_weekly_shifts: int
#     max_shifts_per_day: int
#     min_shifts_per_day: int
#     max_shift_length: int
#     min_shift_length: int
#     max_days_per_week: int
#     min_days_per_week: int
#     max_shifts_per_week: int
#     min_shifts_per_week: int
#     max_total_minutes_per_day: int
#     min_total_minutes_per_day: int
#     max_total_minutes_per_week: int
#     min_total_minutes_per_week: int
#     max_total_minutes_per_sunday: int
#     min_total_minutes_per_sunday: int
#     max_total_minutes_per_monday: int
#     min_total_minutes_per_monday: int
#     max_total_minutes_per_tuesday: int
#     min_total_minutes_per_tuesday: int
#     max_total_minutes_per_wednesday: int
#     min_total_minutes_per_wednesday: int
#     max_total_minutes_per_thursday: int
#     min_total_minutes_per_thursday: int
#     max_total_minutes_per_friday: int
#     min_total_minutes_per_friday: int
#     max_total_minutes_per_saturday: int
#     min_total_minutes_per_saturday: int
#     max_total_minutes_per_public_holiday: int
#     min_total_minutes_per_public_holiday: int
#     max_total_minutes_per_day_shift: int
#     min_total_minutes_per_day_shift: int
#     max_total_minutes_per_evening_shift: int
#     min_total_minutes_per_evening_shift: int
#     max_total_minutes_per_night_shift: int
#     min_total_minutes_per_night_shift: int
#     max_total_minutes_per_day_shift_on_weekend: int
#     min_total_minutes_per_day_shift_on_weekend: int
#     max_total_minutes_per_evening_shift_on_weekend: int
#     min_total_minutes_per_evening_shift_on_weekend: int
#     max_total_minutes_per_night_shift_on_weekend: int
#     min_total_minutes_per_night_shift_on_weekend: int
#     max_total_minutes_per_day_shift_on_public_holiday: int
#     min_total_minutes_per_day_shift_on_public_holiday: int
#     max_total_minutes_per_evening_shift_on_public_holiday: int
#     min_total_minutes_per_evening_shift_on_public_holiday: int
#     max_total_minutes_per_night_shift_on_public_holiday: int
#     min_total_minutes_per_night_shift_on_public_holiday: int
#     max_total_minutes_per_day_shift_on_weekday: int
#     min_total_minutes_per_day_shift_on_weekday: int
#     max_total_minutes_per_evening_shift_on_weekday: int
#     min_total_minutes_per_evening_shift_on_weekday: int
#     max_total_minutes_per_night_shift_on_weekday: int
#     min_total_minutes_per_night_shift_on_weekday: int
#     max_total_minutes_per_day_shift_on_weekend: int
#     min_total_minutes_per_day_shift_on_weekend: int
#     max_total_minutes_per_evening_shift_on_weekend: int
#     min_total_minutes_per_evening_shift_on_weekend: int
#     max_total_minutes_per_night_shift_on_weekend: int
#     min_total_minutes_per_night_shift_on_weekend: int
#     max_total_minutes_per_day_shift_on_public_holiday: int
#     min_total_minutes_per_day_shift_on_public_holiday: int
#     max_total_minutes_per_evening_shift_on_public_holiday: int
#     min_total_minutes_per_evening_shift_on_public_holiday: int
#     max_total_minutes_per_night_shift_on_public_holiday: int
#     min_total_minutes_per_night_shift_on_public_holiday: int
#     max_total_minutes_per_day_shift_on_weekday: int
#     min_total_minutes_per_day_shift_on_weekday: int
#     max_total_minutes_per_evening_shift_on_weekday: int
#     min_total_minutes_per_evening_shift_on_weekday: int
#     max_total_minutes_per_night_shift_on_weekday: int
