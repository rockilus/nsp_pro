from datetime import date
from typing import List, Union

from bson import ObjectId

from core.schedule import Assignment, Schedule
from core.shift import Shift
from core.worker import Worker
from database.db import DB
from database.schedule_db import to_mongo_schedule
from database.shift_db import to_mongo_shift
from database.worker_db import to_mongo_worker
from models.assignment import Assignment as AssignmentDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class AssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    def create_assignment(
        self,
        worker: Worker,
        a_date: date,
        shift: Shift,
        schedule: Schedule,
    ) -> Assignment:
        assignment = AssignmentDocument(
            id=str(ObjectId()),
            worker=to_mongo_worker(worker),
            date=a_date,
            shift=to_mongo_shift(shift),
            schedule=to_mongo_schedule(schedule),
        )
        assignment_saved = assignment.save()
        return _from_mongo_assignment(assignment_saved)

    def get_assignments(self) -> List[Assignment]:
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.all()  # type: ignore
        return [_from_mongo_assignment(c) for c in list(assignments)]

    def get_assignment_by_id(self, assignment_id: str) -> Assignment:
        # pylint: disable=no-member
        assignment = AssignmentDocument.objects.get(id=assignment_id)  # type: ignore
        return _from_mongo_assignment(assignment)

    def get_assignment_by_worker_date_schedule(
        self,
        worker: Worker,
        a_date: date,
        schedule: Schedule,
    ) -> Union[Assignment, None]:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                worker=to_mongo_worker(worker),
                date=a_date,
                schedule=to_mongo_schedule(schedule),
            )
        except AssignmentDocument.DoesNotExist:
            return None
        return _from_mongo_assignment(assignment)

    def update_assignment(self, assignment: Assignment) -> Assignment:
        document = to_mongo_assignment(assignment)
        document_saved = document.save()
        return _from_mongo_assignment(document_saved)

    def delete_assignment(self, assignment_id: str) -> None:
        # pylint: disable=no-member
        assignment = AssignmentDocument.objects.get(id=assignment_id)  # type: ignore
        assignment.delete()

    def delete_assignments_by_schedule_id(self, schedule_id: str) -> None:
        # pylint: disable=no-member
        AssignmentDocument.objects.filter(schedule=schedule_id).delete()  # type: ignore


# Mappers
def to_mongo_assignment(dataclass_obj: Assignment) -> AssignmentDocument:
    # pylint: disable=no-member
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    schedule = ScheduleDocument.objects.get(  # type: ignore
        id=dataclass_obj.schedule_id
    )
    return AssignmentDocument(
        id=dataclass_obj.id,
        worker=worker,
        date=dataclass_obj.date,
        shift=shift,
        schedule=schedule,
    )


def _from_mongo_assignment(doc_obj: AssignmentDocument) -> Assignment:
    return Assignment(
        id=doc_obj.id,
        worker_id=doc_obj.worker.id,
        date=doc_obj.date,
        shift_id=doc_obj.shift.id,
        schedule_id=doc_obj.schedule.id,
    )
