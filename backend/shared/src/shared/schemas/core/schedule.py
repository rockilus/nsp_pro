from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.assignment import (
    Assignment,
    AssignmentsRecurrencesResult,
)
from shared.schemas.core.breach import Breach
from shared.schemas.core.request import RequestAugmented
from shared.schemas.core.shift_demand_new import DemandsResult
from shared.schemas.dto.schedule import (
    DuplicateOptionsDTO,
    DuplicateRequestDTO,
    DuplicateResultDTO,
    QuickStaffingDTO,
    ScheduleDTO,
    SolutionDTO,
    SolveDetailsDTO,
    WorkTimeTableDataDTO,
    WorkTimeTableDTO,
)


@dataclass
class QuickStaffing:
    worker_id: str
    shift_id: str
    target: int

    def to_dto(self) -> QuickStaffingDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(QuickStaffingDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: QuickStaffingDTO) -> "QuickStaffing":
        data_snake = humps.decamelize(data.model_dump())
        return QuickStaffing(**data_snake)


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

    def to_dto(self) -> SolveDetailsDTO:
        data = asdict(self)
        data["updated_at"] = self.updated_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SolveDetailsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: SolveDetailsDTO) -> "SolveDetails":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["status"] = SolveDetailsStatus(data_snake["status"])
        data_snake["updated_at"] = datetime.fromtimestamp(
            data_snake["updated_at"], tz=timezone.utc
        )
        return SolveDetails(**data_snake)


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

    def to_dto(self) -> ScheduleDTO:
        data = asdict(self)
        data["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["last_modified_dates"] = self.last_modified_dates.timestamp()
        if self.solve_details:
            data["solve_details"] = self.solve_details.to_dto()
        data["solve_status"] = self.solve_status.value
        data["status"] = self.status.value
        data["missing_coverage_dates"] = [
            datetime.combine(dt, time.min, tzinfo=timezone.utc).timestamp()
            for dt in self.missing_coverage_dates
        ]
        data["last_updated_dsds"] = (
            self.last_updated_dsds.timestamp()
            if self.last_updated_dsds is not None
            else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ScheduleDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ScheduleDTO) -> "Schedule":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["start_date"] = datetime.fromtimestamp(
            data_snake["start_date"], timezone.utc
        ).date()
        data_snake["end_date"] = datetime.fromtimestamp(
            data_snake["end_date"], timezone.utc
        ).date()
        data_snake["last_modified_dates"] = datetime.fromtimestamp(
            data_snake["last_modified_dates"], timezone.utc
        )
        if data_snake.get("solve_details", None) is not None:
            data_snake["solve_details"] = (
                SolveDetails.from_dto(data.solveDetails) if data.solveDetails else None
            )
        data_snake["solve_status"] = ScheduleSolveStatus(data_snake["solve_status"])
        data_snake["status"] = ScheduleStatus(data_snake["status"])
        data_snake["missing_coverage_dates"] = [
            datetime.fromtimestamp(ts, timezone.utc).date()
            for ts in data_snake["missing_coverage_dates"]
        ]
        data_snake["last_updated_dsds"] = (
            datetime.fromtimestamp(data_snake["last_updated_dsds"], timezone.utc)
            if data_snake.get("last_updated_dsds", None) is not None
            else None
        )
        return Schedule(**data_snake)


@dataclass
class WorkTimeTableData:
    hours: int
    count: int

    def to_dto(self) -> WorkTimeTableDataDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(WorkTimeTableDataDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: WorkTimeTableDataDTO) -> "WorkTimeTableData":
        data_snake = humps.decamelize(data.model_dump())
        return WorkTimeTableData(**data_snake)


@dataclass
class WorkTimeTable:
    duties: WorkTimeTableData
    others: WorkTimeTableData
    workers: WorkTimeTableData
    nb_weeks: float

    def to_dto(self) -> WorkTimeTableDTO:
        data = asdict(self)
        data["duties"] = self.duties.to_dto()
        data["others"] = self.others.to_dto()
        data["workers"] = self.workers.to_dto()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(WorkTimeTableDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: WorkTimeTableDTO) -> "WorkTimeTable":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["duties"] = WorkTimeTableData.from_dto(data_snake["duties"])
        data_snake["others"] = WorkTimeTableData.from_dto(data_snake["others"])
        data_snake["workers"] = WorkTimeTableData.from_dto(data_snake["workers"])
        return WorkTimeTable(**data_snake)


@dataclass
class Solution:
    schedule: Schedule
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[RequestAugmented]

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["schedule"] = self.schedule.to_dict()
        out["assignments"] = [assignment.to_dict() for assignment in self.assignments]
        out["breaches"] = [breach.to_dict() for breach in self.breaches]
        out["requests"] = [request.to_dict() for request in self.requests]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Solution":
        data["schedule"] = Schedule.from_dict(data["schedule"])
        data["assignments"] = [
            Assignment.from_dict(assignment) for assignment in data["assignments"]
        ]
        data["breaches"] = [Breach.from_dict(breach) for breach in data["breaches"]]
        data["requests"] = [
            RequestAugmented.from_dict(request) for request in data["requests"]
        ]
        return Solution(**data)

    def to_dto(self) -> SolutionDTO:
        data = asdict(self)
        data["schedule"] = self.schedule.to_dto()
        data["assignments"] = [assignment.to_dto() for assignment in self.assignments]
        data["breaches"] = [breach.to_dto() for breach in self.breaches]
        data["requests"] = [request.to_dto() for request in self.requests]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SolutionDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: SolutionDTO) -> "Solution":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["schedule"] = Schedule.from_dto(data_snake["schedule"])
        data_snake["assignments"] = [
            Assignment.from_dto(assignment) for assignment in data_snake["assignments"]
        ]
        data_snake["breaches"] = [
            Breach.from_dto(breach) for breach in data_snake["breaches"]
        ]
        data_snake["requests"] = [
            RequestAugmented.from_dto(request) for request in data_snake["requests"]
        ]
        return Solution(**data_snake)


@dataclass
class Period:
    start_date: date
    end_date: date


@dataclass
class DuplicateOptions:
    copy_assignments: bool
    copy_demands: bool
    # copy_tasks: bool
    # copy_notes: bool
    # overwrite_existing: bool

    def to_dto(self) -> DuplicateOptionsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DuplicateOptionsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: DuplicateOptionsDTO) -> "DuplicateOptions":
        data_snake = humps.decamelize(data.model_dump())
        return DuplicateOptions(**data_snake)


@dataclass
class DuplicateRequest:
    source_period: Period
    target_period: Period
    options: DuplicateOptions

    def to_dto(self) -> DuplicateRequestDTO:
        data = asdict(self)
        data["source_period"] = {
            "start_date": datetime.combine(
                self.source_period.start_date, time.min, tzinfo=timezone.utc
            ).timestamp(),
            "end_date": datetime.combine(
                self.source_period.end_date, time.min, tzinfo=timezone.utc
            ).timestamp(),
        }
        data["target_period"] = {
            "start_date": datetime.combine(
                self.target_period.start_date, time.min, tzinfo=timezone.utc
            ).timestamp(),
            "end_date": datetime.combine(
                self.target_period.end_date, time.min, tzinfo=timezone.utc
            ).timestamp(),
        }
        data["options"] = self.options.to_dto()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DuplicateRequestDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: DuplicateRequestDTO) -> "DuplicateRequest":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["source_period"] = Period(
            start_date=datetime.fromtimestamp(
                data_dict["source_period"]["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(
                data_dict["source_period"]["end_date"], tz=timezone.utc
            ).date(),
        )
        data_dict["target_period"] = Period(
            start_date=datetime.fromtimestamp(
                data_dict["target_period"]["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(
                data_dict["target_period"]["end_date"], tz=timezone.utc
            ).date(),
        )
        data_dict["options"] = DuplicateOptions.from_dto(data.options)
        return cls(**data_dict)


@dataclass
class DuplicateResult:
    assignments: AssignmentsRecurrencesResult | None
    demands: DemandsResult | None

    def to_dto(self) -> DuplicateResultDTO:
        data = asdict(self)
        data["assignments"] = self.assignments.to_dto() if self.assignments else None
        data["demands"] = self.demands.to_dto() if self.demands else None
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DuplicateResultDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: DuplicateResultDTO) -> "DuplicateResult":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["assignments"] = (
            AssignmentsRecurrencesResult.from_dto(data_dict["assignments"])
            if data_dict.get("assignments", None) is not None
            else None
        )
        data_dict["demands"] = (
            DemandsResult.from_dto(data_dict["demands"])
            if data_dict.get("demands", None) is not None
            else None
        )
        return cls(**data_dict)
