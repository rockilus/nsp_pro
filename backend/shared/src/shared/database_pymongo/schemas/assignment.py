from datetime import datetime

from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.schedule import Assignment


class AssignmentSchema(DocumentBaseSchema):
    """Assignment schema for validation."""

    team: ObjectId
    schedule: ObjectId
    worker: ObjectId
    date: datetime
    shift: ObjectId
    fixed: bool

    def to_core(self) -> Assignment:
        doc_dict = self.to_mongo()
        doc_dict["id"] = str(doc_dict.pop("_id"))
        doc_dict["team_id"] = str(doc_dict.pop("team"))
        doc_dict["schedule_id"] = str(doc_dict.pop("schedule"))
        doc_dict["worker_id"] = str(doc_dict.pop("worker"))
        doc_dict["date"] = doc_dict["date"].date()
        doc_dict["shift_id"] = str(doc_dict.pop("shift"))
        return Assignment(**doc_dict)

    @classmethod
    def from_core(cls, assignment: Assignment) -> "AssignmentSchema":
        return cls(
            id=(
                ObjectId(assignment.id)
                if assignment.id and ObjectId.is_valid(assignment.id)
                else None
            ),
            team=ObjectId(assignment.team_id),
            schedule=ObjectId(assignment.schedule_id),
            worker=ObjectId(assignment.worker_id),
            date=datetime(
                assignment.date.year,
                assignment.date.month,
                assignment.date.day,
            ),
            shift=ObjectId(assignment.shift_id),
            fixed=assignment.fixed,
        )
