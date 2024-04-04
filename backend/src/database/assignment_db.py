from datetime import date, datetime
from typing import List, Union

from bson import ObjectId

from core.schedule import Assignment, Schedule
from core.worker import Worker
from database.db import DB
from database.schedule_db import core_to_doc_schedule
from database.worker_db import core_to_doc_worker
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models.assignment import Assignment as AssignmentDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class AssignmentDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_assignment(self, assignment: Assignment) -> Assignment:
        a_doc = core_to_doc_assignment(assignment)
        a_doc.id = str(ObjectId())
        try:
            a_saved = a_doc.save()
        except Exception as e:
            log_info("Failed to save assignment to database")
            handle_save_document_error(e)
        return doc_to_core_assignment(a_saved)

    def create_assignments(self, assignments: List[Assignment]) -> List[Assignment]:
        try:
            a_docs = core_to_doc_assignments_new(assignments)
        except Exception as e:
            log_info("Failed to convert Assignments to AssignmentDocuments")
            handle_create_document_error(e)
        try:
            # pylint: disable=no-member
            a_saved = AssignmentDocument.objects.insert(a_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save assignments to database")
            handle_save_document_error(e)
        return [doc_to_core_assignment(a) for a in a_saved]

    def get_assignments(self, schedules: List[Schedule]) -> List[Assignment]:
        s_docs = [core_to_doc_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                schedule__in=s_docs
            )
        except Exception as e:
            log_info("Failed to get assignments from database")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignment_by_id(self, assignment_id: str) -> Assignment:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                id=assignment_id
            )
        except Exception as e:
            log_info("Failed to get assignment by id from database")
            handle_get_document_error(e)
        return doc_to_core_assignment(assignment)

    def get_assignment_by_worker_date_schedule(
        self, worker: Worker, a_date: date, schedule: Schedule
    ) -> Union[Assignment, None]:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                worker=core_to_doc_worker(worker),
                date=a_date,
                schedule=core_to_doc_schedule(schedule),
            )
        except AssignmentDocument.DoesNotExist:
            return None
        except Exception as e:
            log_info(
                "Failed to get assignment by worker, date and schedule from "
                + "database"
            )
            handle_get_document_error(e)
        return doc_to_core_assignment(assignment)

    def get_assignments_by_dates(
        self, start_date: date, end_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [core_to_doc_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                date__gte=start_date, date__lte=end_date, schedule__in=s_docs
            )
        except Exception as e:
            log_info("Failed to get assignments by dates from database")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignments_by_schedule_id(self, schedule_id: str) -> List[Assignment]:
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get assignments by schedule id from database")
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_wip_validated_assignments_before_date(
        self, a_date: date, schedules: List[Schedule]
    ) -> List[Assignment]:
        s_docs = [core_to_doc_schedule(s) for s in schedules]
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
                + "from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_assignment(a) for a in list(assignments)]

    def get_assignments_by_status(
        self, status: List[str], schedules: List[Schedule]
    ) -> List[Assignment]:
        try:
            # pylint: disable=no-member
            a_docs = AssignmentDocument.objects.filter(  # type: ignore
                status__in=status, schedule__in=[s.id for s in schedules]
            )
        except Exception as e:
            log_info("Failed to get assignments by status from database")
            handle_get_document_error(e)
        try:
            assigments = [doc_to_core_assignment(a) for a in list(a_docs)]
        except Exception as e:
            log_info("Failed to convert AssignmentDocuments to Assignments")
            handle_create_core_object_error(e)
        return assigments

    def update_assignment(self, assignment: Assignment) -> Assignment:
        a_doc = core_to_doc_assignment(assignment)
        try:
            # pylint: disable=no-member
            AssignmentDocument.objects.get(id=a_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Assignment with id {a_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            a_saved = a_doc.save()
        except Exception as e:
            log_info("Failed to update assignment")
            handle_save_document_error(e)
        return doc_to_core_assignment(a_saved)

    def delete_assignment(self, assignment_id: str) -> None:
        try:
            # pylint: disable=no-member
            assignment = AssignmentDocument.objects.get(  # type: ignore
                id=assignment_id
            )
        except Exception as e:
            log_info("Failed to get assignment by id to delete")
            handle_get_document_error(e)
        try:
            assignment.delete()
        except Exception as e:
            log_info("Failed to delete assignment")
            handle_delete_document_error(e)

    def delete_assignments_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            AssignmentDocument.objects(schedule=schedule_id).delete()  # type: ignore
        except Exception as e:
            log_info("Failed to delete assignments")
            handle_delete_document_error(e)

    def delete_assignments_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                worker=worker_id
            )
        except Exception as e:
            log_info("Failed to get assignments by worker id to delete")
            handle_get_document_error(e)
        try:
            for a in assignments:
                a.delete()
        except Exception as e:
            log_info("Failed to delete assignments")
            handle_delete_document_error(e)

    def delete_assignments_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            assignments = AssignmentDocument.objects.filter(  # type: ignore
                shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get assignments by shift id to delete")
            handle_get_document_error(e)
        try:
            for a in assignments:
                a.delete()
        except Exception as e:
            log_info("Failed to delete assignments")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_assignment(dataclass_obj: Assignment) -> AssignmentDocument:
    try:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get worker by id")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info("Failed to get schedule by id")
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
        log_info("Failed to convert Assignment to AssignmentDocument")
        handle_create_document_error(e)
    return assignment_doc


def core_to_doc_assignments_new(
    dataclass_objs: List[Assignment],
) -> List[AssignmentDocument]:
    worker_ids = list(set(doc.worker_id for doc in dataclass_objs))
    # pylint: disable=no-member
    workers = {
        worker.id: worker
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
    }
    shift_ids = list(set(doc.shift_id for doc in dataclass_objs))
    shifts = {
        shift.id: shift
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    schedule_ids = list(set(doc.schedule_id for doc in dataclass_objs))
    schedules = {
        schedule.id: schedule
        for schedule in ScheduleDocument.objects.filter(  # type: ignore
            id__in=schedule_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        # a_dict = asdict(dataclass_obj)
        # a_dict["id"] = str(ObjectId())
        # a_dict["worker"] = workers.get(dataclass_obj.worker_id)
        # a_dict["date"] = datetime(
        #     dataclass_obj.date.year,
        #     dataclass_obj.date.month,
        #     dataclass_obj.date.day,
        # )
        # a_dict["shift"] = shifts.get(dataclass_obj.shift_id)
        # a_dict["schedule"] = schedules.get(dataclass_obj.schedule_id)
        # a_dict.pop("worker_id")
        # a_dict.pop("shift_id")
        # a_dict.pop("schedule_id")
        # assignment_doc = AssignmentDocument(**a_dict)
        assignment_doc = AssignmentDocument(
            id=str(ObjectId()),
            worker=workers.get(dataclass_obj.worker_id),
            date=datetime(
                dataclass_obj.date.year,
                dataclass_obj.date.month,
                dataclass_obj.date.day,
            ),
            shift=shifts.get(dataclass_obj.shift_id),
            schedule=schedules.get(dataclass_obj.schedule_id),
            status=dataclass_obj.status,
        )
        out.append(assignment_doc)
    return out


# document to core
def doc_to_core_assignment(doc_obj: AssignmentDocument) -> Assignment:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["worker_id"] = doc_dict["worker"]
    doc_dict["date"] = doc_dict["date"].date()
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict.pop("_id")
    doc_dict.pop("worker")
    doc_dict.pop("shift")
    doc_dict.pop("schedule")
    return Assignment(**doc_dict)
