from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from shared.database_pymongo.schemas.base import BaseSchema, DocumentBaseSchema
from shared.schemas.schemas.schedule import Breach, ObjectiveCategory, Variable


class VariableSchema(BaseSchema):
    """Variable embedded schema."""

    worker: Optional[ObjectId] = None
    date: datetime
    shift: ObjectId

    def to_mongo(self) -> Dict[str, Any]:
        return {
            "worker": self.worker,
            "date": self.date,
            "shift": self.shift,
        }

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "VariableSchema":
        return cls(
            worker=data.get("worker", None),
            date=data["date"],
            shift=data["shift"],
        )

    def to_core(self) -> Variable:
        return Variable(
            worker_id=str(self.worker),
            date=self.date.date(),
            shift_id=str(self.shift),
        )

    @classmethod
    def from_core(cls, variable: Variable) -> "VariableSchema":
        return cls(
            worker=(
                ObjectId(variable.worker_id)
                if variable.worker_id and ObjectId.is_valid(variable.worker_id)
                else None
            ),
            date=datetime.combine(variable.date, time.min, tzinfo=timezone.utc),
            shift=ObjectId(variable.shift_id),
        )


class BreachSchema(DocumentBaseSchema):
    """Breach schema for validation."""

    schedule: ObjectId
    objective_id: Optional[ObjectId] = None
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
        data["id"] = data.pop("_id")
        data["schedule"] = data["schedule"]
        data["objective_id"] = data.get("objective_id", None)
        data["variables"] = [
            VariableSchema.from_mongo(var) for var in data["variables"]
        ]
        return cls(**data)

    def to_core(self) -> Breach:
        return Breach(
            id=str(self.id) or "",
            schedule_id=str(self.schedule),
            objective_id=str(self.objective_id) if self.objective_id else None,
            objective_category=ObjectiveCategory(self.objective_category),
            variables=[variable.to_core() for variable in self.variables],
            description=self.description,
            hard_to_soft=self.hard_to_soft,
        )

    @classmethod
    def from_core(cls, breach: Breach) -> "BreachSchema":
        return cls(
            id=(
                ObjectId(breach.id)
                if breach.id and ObjectId.is_valid(breach.id)
                else None
            ),
            schedule=ObjectId(breach.schedule_id),
            objective_id=(
                ObjectId(breach.objective_id)
                if breach.objective_id and ObjectId.is_valid(breach.objective_id)
                else None
            ),
            objective_category=breach.objective_category.value,
            variables=[VariableSchema.from_core(var) for var in breach.variables],
            description=breach.description,
            hard_to_soft=breach.hard_to_soft,
        )
