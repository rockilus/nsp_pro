from datetime import date, datetime
from typing import List

from bson import ObjectId
from core.fixed_assignment import FixedAssignment
from core.shift import Shift
from core.worker import Worker
from database.db import DB
from database.shift_db import to_mongo_shift
from database.worker_db import to_mongo_worker
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.fixed_assignment import FixedAssignment as FixedAssignmentDocument


class FixedAssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    def create_fixed_assignment(
        self,
        worker: Worker,
        target_date: date,
        shift: Shift,
    ) -> FixedAssignment:
        fixed_assignment = FixedAssignmentDocument(
            id=str(ObjectId()),
            worker=to_mongo_worker(worker),
            date=target_date,
            shift=to_mongo_shift(shift),
        )
        fixed_assignment_saved = fixed_assignment.save()
        return _from_mongo_fixed_assignment(fixed_assignment_saved)

    def get_fixed_assignments(self) -> List[FixedAssignment]:
        # pylint: disable=no-member
        fixed_assignments = FixedAssignmentDocument.objects.all()  # type: ignore
        return [
            _from_mongo_fixed_assignment(fa) for fa in list(fixed_assignments)
        ]

    def get_fixed_assignment_by_id(
        self, fixed_assignment_id: str
    ) -> FixedAssignment:
        # pylint: disable=no-member
        fixed_assignment = FixedAssignmentDocument.objects.get(id=fixed_assignment_id)  # type: ignore
        return _from_mongo_fixed_assignment(fixed_assignment)

    def update_fixed_assignment(
        self, fixed_assignment: FixedAssignment
    ) -> FixedAssignment:
        document = to_mongo_fixed_assignment(fixed_assignment)
        document_saved = document.save()
        return _from_mongo_fixed_assignment(document_saved)

    def delete_fixed_assignment(self, fixed_assignment_id: str) -> None:
        # pylint: disable=no-member
        fixed_assignment = FixedAssignmentDocument.objects.get(id=fixed_assignment_id)  # type: ignore
        fixed_assignment.delete()


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
    )


def _from_mongo_fixed_assignment(
    doc_obj: FixedAssignmentDocument,
) -> FixedAssignment:
    date_datetime = datetime.combine(doc_obj.date, datetime.min.time())
    return FixedAssignment(
        id=doc_obj.id,
        worker_id=doc_obj.worker.id,
        date=date_datetime,
        shift_id=doc_obj.shift.id,
    )
