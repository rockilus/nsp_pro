from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List


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
