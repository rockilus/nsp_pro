from datetime import datetime
from typing import Any, Dict

from shared.database_pymongo_str_id.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.schedule import Assignment


class AssignmentSchema(DocumentBaseSchema):
    """Assignment schema for validation."""

    team: str
    schedule: str
    worker: str
    date: datetime
    shift: str
    fixed: bool

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "AssignmentSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> Assignment:
        doc_dict = self.to_mongo()
        doc_dict["id"] = doc_dict.pop("_id")
        doc_dict["team_id"] = doc_dict.pop("team")
        doc_dict["schedule_id"] = doc_dict.pop("schedule")
        doc_dict["worker_id"] = doc_dict.pop("worker")
        doc_dict["date"] = doc_dict["date"].date()
        doc_dict["shift_id"] = doc_dict.pop("shift")
        return Assignment(**doc_dict)

    @classmethod
    def from_core(cls, assignment: Assignment) -> "AssignmentSchema":
        return cls(
            id=assignment.id,
            team=assignment.team_id,
            schedule=assignment.schedule_id,
            worker=assignment.worker_id,
            date=datetime(
                assignment.date.year,
                assignment.date.month,
                assignment.date.day,
            ),
            shift=assignment.shift_id,
            fixed=assignment.fixed,
        )
