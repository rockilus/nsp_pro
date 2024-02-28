from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.fixed_assignment import FixedAssignment
from database.db import DB
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.fixed_assignment import FixedAssignment as FixedAssignmentDocument


class FixedAssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    def create_fixed_assignment(
        self, fixed_assignment: FixedAssignment
    ) -> FixedAssignment:
        fa_data = to_mongo_fixed_assignment(fixed_assignment)
        fa_doc = FixedAssignmentDocument(
            id=str(ObjectId()),
            worker=fa_data.worker,
            date=fa_data.date,
            shift=fa_data.shift,
            status="pending",
        )
        fa_saved = fa_doc.save()
        return _from_mongo_fixed_assignment(fa_saved)

    def get_fixed_assignments(self, team_id: str) -> List[FixedAssignment]:
        # pylint: disable=no-member
        fixed_assignments = FixedAssignmentDocument.objects.filter(  # type: ignore
            worker__team=team_id
        )
        return [_from_mongo_fixed_assignment(fa) for fa in list(fixed_assignments)]

    def get_fixed_assignment_by_id(self, fixed_assignment_id: str) -> FixedAssignment:
        # pylint: disable=no-member
        fixed_assignment = FixedAssignmentDocument.objects.get(  # type: ignore
            id=fixed_assignment_id
        )
        return _from_mongo_fixed_assignment(fixed_assignment)

    def get_fixed_assignments_by_dates(
        self, start_date: date, end_date: date, team_id: str
    ) -> List[FixedAssignment]:
        # pylint: disable=no-member
        fixed_assignments = FixedAssignmentDocument.objects.filter(  # type: ignore
            date__gte=start_date, date__lte=end_date, worker__team=team_id
        )
        return [_from_mongo_fixed_assignment(fa) for fa in list(fixed_assignments)]

    def update_fixed_assignment(
        self, fixed_assignment: FixedAssignment
    ) -> FixedAssignment:
        fa_doc = to_mongo_fixed_assignment(fixed_assignment)
        fa_saved = fa_doc.save()
        return _from_mongo_fixed_assignment(fa_saved)

    def delete_fixed_assignment(self, fixed_assignment_id: str) -> None:
        # pylint: disable=no-member
        fixed_assignment = FixedAssignmentDocument.objects.get(  # type: ignore
            id=fixed_assignment_id
        )
        fixed_assignment.delete()

    def delete_fixed_assignments_by_worker_id(self, worker_id: str) -> None:
        # pylint: disable=no-member
        fas = FixedAssignmentDocument.objects.filter(worker=worker_id)  # type: ignore
        for fa in fas:
            fa.delete()


# Mappers
def to_mongo_fixed_assignment(
    dataclass_obj: FixedAssignment,
) -> FixedAssignmentDocument:
    # pylint: disable=no-member
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    return FixedAssignmentDocument(
        id=dataclass_obj.id,
        worker=worker,
        date=dataclass_obj.date,
        shift=shift,
        status=dataclass_obj.status,
    )


def _from_mongo_fixed_assignment(
    doc_obj: FixedAssignmentDocument,
) -> FixedAssignment:
    date_datetime = datetime.combine(doc_obj.date, datetime.min.time()).date()
    return FixedAssignment(
        id=doc_obj.id,
        worker_id=doc_obj.worker.id,
        date=date_datetime,
        shift_id=doc_obj.shift.id,
        status=doc_obj.status,
    )
