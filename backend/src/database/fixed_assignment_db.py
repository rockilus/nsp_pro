from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.fixed_assignment import FixedAssignment
from core.worker import Worker
from database.db import DB
from database.worker_db import to_mongo_worker
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.fixed_assignment import FixedAssignment as FixedAssignmentDocument
from services.logging import log_info


class FixedAssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    def create_fixed_assignment(
        self, fixed_assignment: FixedAssignment
    ) -> FixedAssignment:
        fa_doc = core_to_doc_fixed_assignment(fixed_assignment)
        fa_doc.id = str(ObjectId())
        try:
            fa_saved = fa_doc.save()
        except Exception as e:
            log_info(f"Failed to save fixed assignment to database: {e}")
            handle_save_document_error(e)
        return _from_mongo_fixed_assignment(fa_saved)

    def get_fixed_assignments(self, workers: List[Worker]) -> List[FixedAssignment]:
        w_docs = [to_mongo_worker(w) for w in workers]
        try:
            # pylint: disable=no-member
            fixed_assignments = FixedAssignmentDocument.objects.filter(  # type: ignore
                worker__in=w_docs
            )
        except Exception as e:
            log_info(f"Failed to get fixed assignments by workers from database: {e}")
            handle_get_document_error(e)
        return [_from_mongo_fixed_assignment(fa) for fa in list(fixed_assignments)]

    def get_fixed_assignment_by_id(self, fixed_assignment_id: str) -> FixedAssignment:
        try:
            # pylint: disable=no-member
            fixed_assignment = FixedAssignmentDocument.objects.get(  # type: ignore
                id=fixed_assignment_id
            )
        except Exception as e:
            log_info(f"Failed to get fixed assignment by id from database: {e}")
            handle_get_document_error(e)
        return _from_mongo_fixed_assignment(fixed_assignment)

    def get_fixed_assignments_by_dates(
        self, start_date: date, end_date: date, workers: List[Worker]
    ) -> List[FixedAssignment]:
        w_docs = [to_mongo_worker(w) for w in workers]
        try:
            # pylint: disable=no-member
            fixed_assignments = FixedAssignmentDocument.objects.filter(  # type: ignore
                date__gte=start_date, date__lte=end_date, worker__in=w_docs
            )
        except Exception as e:
            log_info(f"Failed to get fixed assignments by dates from database: {e}")
            handle_get_document_error(e)
        return [_from_mongo_fixed_assignment(fa) for fa in list(fixed_assignments)]

    def update_fixed_assignment(
        self, fixed_assignment: FixedAssignment
    ) -> FixedAssignment:
        fa_doc = core_to_doc_fixed_assignment(fixed_assignment)
        try:
            fa_saved = fa_doc.save()
        except Exception as e:
            log_info(f"Failed to update fixed assignment to database: {e}")
            handle_save_document_error(e)
        return _from_mongo_fixed_assignment(fa_saved)

    def delete_fixed_assignment(self, fixed_assignment_id: str) -> None:
        try:
            # pylint: disable=no-member
            fixed_assignment = FixedAssignmentDocument.objects.get(  # type: ignore
                id=fixed_assignment_id
            )
        except Exception as e:
            log_info(
                f"Failed to get fixed assignment by id to delete from database: {e}"
            )
            handle_get_document_error(e)
        try:
            fixed_assignment.delete()
        except Exception as e:
            log_info(f"Failed to delete fixed assignment from database: {e}")
            handle_delete_document_error(e)

    def delete_fixed_assignments_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            fas = FixedAssignmentDocument.objects.filter(  # type: ignore
                worker=worker_id
            )
        except Exception as e:
            log_info(
                "Failed to get fixed assignments by worker id to delete from "
                + f"database: {e}"
            )
            handle_get_document_error(e)
        try:
            for fa in fas:
                fa.delete()
        except Exception as e:
            log_info(f"Failed to delete fixed assignments from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
# pylint: disable=R0801
def core_to_doc_fixed_assignment(
    dataclass_obj: FixedAssignment,
) -> FixedAssignmentDocument:
    try:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get worker by id: {e}")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get shift by id: {e}")
        handle_get_document_error(e)
    try:
        fa_doc = FixedAssignmentDocument(
            id=dataclass_obj.id,
            worker=worker,
            date=dataclass_obj.date,
            shift=shift,
            status=dataclass_obj.status,
        )
    except Exception as e:
        log_info(f"Failed to convert FixedAssignment to FixedAssignmentDocument: {e}")
        handle_create_document_error(e)
    return fa_doc


# document to core
def _from_mongo_fixed_assignment(
    doc_obj: FixedAssignmentDocument,
) -> FixedAssignment:
    date_datetime = datetime.combine(doc_obj.date, datetime.min.time()).date()
    try:
        fixed_assignment = FixedAssignment(
            id=doc_obj.id,
            worker_id=doc_obj.worker.id,
            date=date_datetime,
            shift_id=doc_obj.shift.id,
            status=doc_obj.status,
        )
    except Exception as e:
        log_info(f"Failed to convert FixedAssignmentDocument to FixedAssignment: {e}")
        handle_create_core_object_error(e)
    return fixed_assignment
