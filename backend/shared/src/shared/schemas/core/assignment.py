from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.recurrence import RecurrenceRule
from shared.schemas.dto.assignment import (
    AssignmentDTO,
    AssignmentsRecurrencesResultDTO,
)


class AssignmentSource(Enum):
    MANUAL = "manual"
    SOLVER = "solver"
    DUPLICATE = "duplicate"
    RECURRENCE = "recurrence"
    REQUEST = "request"


@dataclass
class Assignment:
    id: str
    team_id: str
    schedule_id: str | None
    worker_id: str
    date: date
    shift_id: str
    fixed: bool
    source: AssignmentSource
    reference_assignment_id: str | None = None
    recurrence_rule_id: str | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["source"] = self.source.value
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
            reference_assignment_id=data.get("reference_assignment_id", None),
            fixed=data["fixed"],
            source=AssignmentSource(data["source"]),
            recurrence_rule_id=data.get("recurrence_rule_id", None),
        )

    def to_dto(self) -> AssignmentDTO:
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["source"] = self.source.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(AssignmentDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: AssignmentDTO) -> "Assignment":
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict["source"] = AssignmentSource(data.source)
        data_dict = humps.decamelize(data_dict)
        return cls(**data_dict)


@dataclass
class AssignmentsRecurrencesResult:
    assignments_created: List[Assignment]
    assignments_read: List[Assignment]
    assignments_updated: List[Assignment]
    assignments_deleted_ids: List[str]
    recurrence_created: RecurrenceRule | None
    recurrences_read: List[RecurrenceRule]
    recurrence_updated: RecurrenceRule | None
    recurrences_deleted_ids: List[str]

    def to_dto(self) -> AssignmentsRecurrencesResultDTO:
        data = asdict(self)
        data["assignments_created"] = [a.to_dict() for a in self.assignments_created]
        data["assignments_read"] = [a.to_dict() for a in self.assignments_read]
        data["assignments_updated"] = [a.to_dict() for a in self.assignments_updated]
        data["recurrences_read"] = [r.to_dto() for r in self.recurrences_read]
        if self.recurrence_created:
            data["recurrence_created"] = self.recurrence_created.to_dto()
        if self.recurrence_updated:
            data["recurrence_updated"] = self.recurrence_updated.to_dto()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(AssignmentsRecurrencesResultDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: AssignmentsRecurrencesResultDTO
    ) -> "AssignmentsRecurrencesResult":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["assignments_created"] = [
            Assignment.from_dict(a) for a in data_dict["assignments_created"]
        ]
        data_dict["assignments_read"] = [
            Assignment.from_dict(a) for a in data_dict["assignments_read"]
        ]
        data_dict["assignments_updated"] = [
            Assignment.from_dict(a) for a in data_dict["assignments_updated"]
        ]
        data_dict["recurrences_read"] = [
            RecurrenceRule.from_dto(r) for r in data_dict["recurrences_read"]
        ]
        data_dict["recurrence_created"] = None
        if data_dict.get("recurrence_created", None):
            data_dict["recurrence_created"] = RecurrenceRule.from_dto(
                data_dict["recurrence_created"]
            )
        data_dict["recurrence_updated"] = None
        if data_dict.get("recurrence_updated"):
            data_dict["recurrence_updated"] = RecurrenceRule.from_dto(
                data_dict["recurrence_updated"]
            )
        return cls(**data_dict)
