from datetime import datetime
from typing import Any, Dict, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.assignment import Assignment


class AssignmentSchema(DocumentBaseSchema):
    """Assignment schema for validation."""

    team: str
    schedule: Optional[str] = None
    worker: str
    date: datetime
    shift: str
    reference_assignment_id: Optional[str] = None
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
        doc_dict["schedule_id"] = doc_dict.pop("schedule", None)
        doc_dict["worker_id"] = doc_dict.pop("worker")
        doc_dict["date"] = doc_dict["date"].date()
        doc_dict["shift_id"] = doc_dict.pop("shift")
        doc_dict["reference_assignment_id"] = doc_dict.pop(
            "reference_assignment_id", None
        )
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
            reference_assignment_id=assignment.reference_assignment_id,
            fixed=assignment.fixed,
        )
