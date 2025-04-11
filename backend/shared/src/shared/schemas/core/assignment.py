from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.assignment import AssignmentDTO


@dataclass
class Assignment:
    id: str
    team_id: str
    schedule_id: str | None
    worker_id: str
    date: date
    shift_id: str
    fixed: bool
    reference_assignment_id: str | None = None
    recurrence_rule_id: str | None = None

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
            reference_assignment_id=data.get("reference_assignment_id", None),
            fixed=data["fixed"],
            recurrence_rule_id=data.get("recurrence_rule_id", None),
        )

    def to_dto(self) -> AssignmentDTO:
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(AssignmentDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: AssignmentDTO) -> "Assignment":
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict = humps.decamelize(data_dict)
        return cls(**data_dict)
