from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Any, Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.breach import BreachDTO, VariableDTO


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

    def to_dto(self) -> VariableDTO:
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(VariableDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: VariableDTO) -> "Variable":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["date"] = datetime.fromtimestamp(
            data_snake["date"], tz=timezone.utc
        ).date()
        return Variable(**data_snake)


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
    WORK_TIME_WEEK_TARGET = 9
    DUTIES_PER_MONTH_TARGET = 10
    SPECIAL_DAYS_TARGET = 11
    MAX_WEEKLY_NB_DUTIES = 12
    MAX_WEEK_DAY_NB_DUTIES = 13
    DUTY_CONSECUTIVE_GAP = 14
    OFF_SHIFT_PENALTY = 15


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
    meta: Dict[str, Any] | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["objective_category"] = self.objective_category.value
        out["variables"] = [var.to_dict() for var in self.variables]
        # include meta when present (internal/core representation)
        if self.meta is not None:
            out["meta"] = self.meta
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
            meta=data.get("meta"),
        )

    def to_dto(self) -> BreachDTO:
        data = asdict(self)
        data["objective_category"] = self.objective_category.value
        data["variables"] = [var.to_dto() for var in self.variables]
        # Do not include internal `meta` field when converting to DTO
        data.pop("meta", None)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(BreachDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: BreachDTO) -> "Breach":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["objective_category"] = ObjectiveCategory(
            data_snake["objective_category"]
        )
        data_snake["variables"] = [
            Variable.from_dto(var) for var in data_snake["variables"]
        ]
        # DTO does not include `meta` so default to None
        data_snake["meta"] = None
        return cls(**data_snake)
