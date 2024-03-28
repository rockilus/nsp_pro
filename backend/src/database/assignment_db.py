from datetime import date, datetime
from typing import List, Union

from bson import ObjectId

from core.schedule import Assignment, Schedule
from core.worker import Worker
from database.db import DB
from database.schedule_db import to_mongo_schedule
from database.worker_db import to_mongo_worker
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models.assignment import Assignment as AssignmentDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument
from services.logging import log_info


class AssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_assignment(self, assignment: Assignment) -> Assignment:
        a_data = core_to_doc_assignment(assignment)
        a_doc = AssignmentDocument(
            id=str(ObjectId()),
            worker=a_data.worker,
            date=a_data.date,
            shift=a_data.shift,
            schedule=a_data.schedule,
            status=a_data.status,
        )
        try:
            a_saved = a_doc.save()
        except Exception as e:
            log_info(f"Failed to save assignment document to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_assignment(a_saved)

    def get_assignments(self, schedules: List[Schedule]) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                schedule__in=s_docs
            )
        except Exception as e:
            log_info(f"Failed to get assignments from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignment_by_id(self, assignment_id: str) -> Assignment:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                id=assignment_id
            )
        except Exception as e:
            log_info(f"Failed to get assignment by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_assignment(assignment)

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
        except Exception as e:
            log_info(
                "Failed to get assignment by worker, date and schedule from "
                + f"database: {e}"
            )
            handle_get_document_error(e)
        return doc_to_core_assignment(assignment)

    def get_assignments_by_dates(
        self, start_date: date, end_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                date__gte=start_date, date__lte=end_date, schedule__in=s_docs
            )
        except Exception as e:
            log_info(f"Failed to get assignments by dates from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignments_by_schedule_id(self, schedule_id: str) -> List[Assignment]:
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info(f"Failed to get assignments by schedule id from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_wip_validated_assignments_before_date(
        self, a_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                date__lt=a_date,
                status__in=["wip", "validated"],
                schedule__in=s_docs,
            )
        except Exception as e:
            log_info(
                "Failed to get wip and validated assignments before date "
                + f"from database: {e}"
            )
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignments_by_status(
        self, status: List[str], schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [to_mongo_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                status__in=status, schedule__in=s_docs
            )
        except Exception as e:
            log_info(f"Failed to get assignments by status from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def update_assignment(self, assignment: Assignment) -> Assignment:
        a_doc = core_to_doc_assignment(assignment)
        try:
            a_saved = a_doc.save()
        except Exception as e:
            log_info(f"Failed to update assignment: {e}")
            handle_save_document_error(e)
        return doc_to_core_assignment(a_saved)

    def delete_assignment(self, assignment_id: str) -> None:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                id=assignment_id
            )
        except Exception as e:
            log_info(f"Failed to get assignment by id to delete: {e}")
            handle_get_document_error(e)
        try:
            assignment.delete()
        except Exception as e:
            log_info(f"Failed to delete assignment: {e}")
            handle_delete_document_error(e)

    def delete_assignments_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            assigments = AssignmentDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info(f"Failed to get assignments by schedule id to delete: {e}")
            handle_get_document_error(e)
        try:
            for a in assigments:
                a.delete()
        except Exception as e:
            log_info(f"Failed to delete assignments: {e}")
            handle_delete_document_error(e)

    def delete_assignments_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                worker=worker_id
            )
        except Exception as e:
            log_info(f"Failed to get assignments by worker id to delete: {e}")
            handle_get_document_error(e)
        try:
            for a in assignments:
                a.delete()
        except Exception as e:
            log_info(f"Failed to delete assignments: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_assignment(dataclass_obj: Assignment) -> AssignmentDocument:
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
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info(f"Failed to get schedule by id: {e}")
        handle_get_document_error(e)
    try:
        assignment_doc = AssignmentDocument(
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
    # pylint: disable=broad-except
    except Exception as e:
        log_info(f"Failed to convert Assignment to AssignmentDocument: {e}")
        handle_create_document_error(e)
    return assignment_doc


# document to core
def doc_to_core_assignment(doc_obj: AssignmentDocument) -> Assignment:
    try:
        assignment = Assignment(
            id=doc_obj.id,
            worker_id=doc_obj.worker.id,
            date=doc_obj.date.date(),
            shift_id=doc_obj.shift.id,
            schedule_id=doc_obj.schedule.id,
            status=doc_obj.status,
        )
    except Exception as e:
        log_info(f"Failed to convert AssignmentDocument to Assignment: {e}")
        handle_create_core_object_error(e)
    return assignment
