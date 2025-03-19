from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from shared.database_pymongo_str_id.schemas.base import (
    BaseSchema,
    DocumentBaseSchema,
)
from shared.schemas.schemas.schedule import Breach, ObjectiveCategory, Variable


class VariableSchema(BaseSchema):
    """Variable embedded schema."""

    worker: Optional[str] = None
    date: datetime
    shift: str

    def to_core(self) -> Variable:
        return Variable(
            worker_id=self.worker,
            date=self.date.date(),
            shift_id=self.shift,
        )

    @classmethod
    def from_core(cls, variable: Variable) -> "VariableSchema":
        return cls(
            worker=variable.worker_id,
            date=datetime.combine(variable.date, time.min, tzinfo=timezone.utc),
            shift=variable.shift_id,
        )


class BreachSchema(DocumentBaseSchema):
    """Breach schema for validation."""

    schedule: str
    objective_id: Optional[str] = None
    objective_category: int
    variables: List[VariableSchema] = []
    description: str
    hard_to_soft: Optional[bool] = None

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        out["variables"] = [variable.to_mongo() for variable in self.variables]
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "BreachSchema":
        data["id"] = str(data.pop("_id"))
        data["variables"] = [
            VariableSchema.from_mongo(var) for var in data["variables"]
        ]
        return cls(**data)

    def to_core(self) -> Breach:
        return Breach(
            id=self.id or "",
            schedule_id=self.schedule,
            objective_id=self.objective_id,
            objective_category=ObjectiveCategory(self.objective_category),
            variables=[variable.to_core() for variable in self.variables],
            description=self.description,
            hard_to_soft=self.hard_to_soft,
        )

    @classmethod
    def from_core(cls, breach: Breach) -> "BreachSchema":
        return cls(
            id=breach.id,
            schedule=breach.schedule_id,
            objective_id=breach.objective_id,
            objective_category=breach.objective_category.value,
            variables=[VariableSchema.from_core(var) for var in breach.variables],
            description=breach.description,
            hard_to_soft=breach.hard_to_soft,
        )
