from datetime import date, datetime
from typing import List, Union

from bson import ObjectId

from core.schedule import Assignment, Schedule
from core.worker import Worker
from database.db import DB
from database.schedule_db import to_mongo_schedule
from database.worker_db import to_mongo_worker
from models.assignment import Assignment as AssignmentDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class AssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_assignment(self, assignment: Assignment) -> Assignment:
        a_data = to_mongo_assignment(assignment)
        a_doc = AssignmentDocument(
            id=str(ObjectId()),
            worker=a_data.worker,
            date=a_data.date,
            shift=a_data.shift,
            schedule=a_data.schedule,
            status=a_data.status,
        )
        a_saved = a_doc.save()
        return _from_mongo_assignment(a_saved)

    def get_assignments(self, schedules: List[Schedule]) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            schedule__in=s_docs
        )
        return [_from_mongo_assignment(a) for a in list(assignments)]

    def get_assignment_by_id(self, assignment_id: str) -> Assignment:
        # pylint: disable=no-member
        assignment = AssignmentDocument.objects.get(id=assignment_id)  # type: ignore
        return _from_mongo_assignment(assignment)

    def get_assignment_by_worker_date_schedule(
        self, worker: Worker, a_date: date, schedule: Schedule
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

    def get_assignments_by_dates(
        self, start_date: date, end_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            date__gte=start_date, date__lte=end_date, schedule__in=s_docs
        )
        return [_from_mongo_assignment(a) for a in list(assignments)]

    def get_assignments_by_schedule_id(self, schedule_id: str) -> List[Assignment]:
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            schedule=schedule_id
        )
        return [_from_mongo_assignment(a) for a in list(assignments)]

    def get_wip_validated_assignments_before_date(
        self, a_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            date__lt=a_date,
            status__in=["wip", "validated"],
            schedule__in=s_docs,
        )
        return [_from_mongo_assignment(a) for a in list(assignments)]

    def get_assignments_by_status(
        self, status: List[str], schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            status__in=status, schedule__in=s_docs
        )
        return [_from_mongo_assignment(a) for a in list(assignments)]

    def update_assignment(self, assignment: Assignment) -> Assignment:
        a_doc = to_mongo_assignment(assignment)
        a_saved = a_doc.save()
        return _from_mongo_assignment(a_saved)

    def delete_assignment(self, assignment_id: str) -> None:
        # pylint: disable=no-member
        assignment = AssignmentDocument.objects.get(id=assignment_id)  # type: ignore
        assignment.delete()

    def delete_assignments_by_schedule_id(self, schedule_id: str) -> None:
        # pylint: disable=no-member
        AssignmentDocument.objects.filter(schedule=schedule_id).delete()  # type: ignore

    def delete_assignments_by_worker_id(self, worker_id: str) -> None:
        # pylint: disable=no-member
        assignments = AssignmentDocument.objects.filter(  # type: ignore
            worker=worker_id
        )
        for a in assignments:
            a.delete()


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
        date=datetime(
            dataclass_obj.date.year,
            dataclass_obj.date.month,
            dataclass_obj.date.day,
        ),
        shift=shift,
        schedule=schedule,
        status=dataclass_obj.status,
    )


def _from_mongo_assignment(doc_obj: AssignmentDocument) -> Assignment:
    return Assignment(
        id=doc_obj.id,
        worker_id=doc_obj.worker.id,
        date=doc_obj.date.date(),
        shift_id=doc_obj.shift.id,
        schedule_id=doc_obj.schedule.id,
        status=doc_obj.status,
    )
