from datetime import datetime
from typing import List

from bson import ObjectId

from core import Breach, ObjectiveCategory, Schedule, Variable
from database.db import DB
from database.schedule_db import core_to_doc_schedule
from errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Breach as ObjectiveBreachDocument
from models import Variable as VariableDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class BreachDB:
    def __init__(self, db: DB):
        self.db = db

    def create_breach(self, breach: Breach) -> Breach:
        b_doc = core_to_doc_breach(breach)
        b_doc.id = str(ObjectId())
        try:
            b_saved = b_doc.save()
        except Exception as e:
            log_info("Failed to save breach to database")
            handle_save_document_error(e)
        return doc_to_core_breach(b_saved)

    def create_breaches(self, breaches: List[Breach]) -> List[Breach]:
        try:
            b_docs = core_to_doc_breaches(breaches, creating=True)
        except Exception as e:
            log_info("Failed to convert ObjectBreaches to ObjectiveBreachDocuments")
            handle_create_document_error(e)
        try:
            # pylint: disable=no-member
            b_saved = ObjectiveBreachDocument.objects.insert(b_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save assignments to database")
            handle_save_document_error(e)
        return [doc_to_core_breach(a) for a in b_saved]

    def get_breaches(self, schedules: List[Schedule]) -> List[Breach]:
        s_docs = [core_to_doc_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                schedule__in=s_docs
            )
        except Exception as e:
            log_info("Failed to get breaches from database")
            handle_get_document_error(e)
        return [doc_to_core_breach(b) for b in list(breaches)]

    def get_breach_by_id(self, breach_id: str) -> Breach:
        try:
            # pylint: disable=no-member
            breach = ObjectiveBreachDocument.objects.get(id=breach_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get breach by id from database")
            handle_get_document_error(e)
        return doc_to_core_breach(breach)

    def get_breaches_by_schedule_id(self, schedule_id: str) -> List[Breach]:
        try:
            # pylint: disable=no-member
            breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get breaches by schedule id from database")
            handle_get_document_error(e)
        return [doc_to_core_breach(b) for b in list(breaches)]

    def get_breaches_by_worker_id(self, worker_id: str) -> List[Breach]:
        try:
            # pylint: disable=no-member
            breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                variables__worker=worker_id
            )
        except Exception as e:
            log_info("Failed to get breaches by worker id from database")
            handle_get_document_error(e)
        return [doc_to_core_breach(b) for b in list(breaches)]

    def get_breaches_by_shift_id(self, shift_id: str) -> List[Breach]:
        try:
            # pylint: disable=no-member
            breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                variables__shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get breaches by shift id from database")
            handle_get_document_error(e)
        return [doc_to_core_breach(b) for b in list(breaches)]

    def update_breach(self, breach: Breach) -> Breach:
        b_doc = core_to_doc_breach(breach)
        try:
            # pylint: disable=no-member
            ObjectiveBreachDocument.objects.get(id=b_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Objective breach with id {b_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            b_saved = b_doc.save()
        except Exception as e:
            log_info("Failed to update breach")
            handle_save_document_error(e)
        return doc_to_core_breach(b_saved)

    def delete_breach(self, breach_id: str) -> None:
        try:
            # pylint: disable=no-member
            breach = ObjectiveBreachDocument.objects.get(id=breach_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get breach by id to delete")
            handle_get_document_error(e)
        try:
            breach.delete()
        except Exception as e:
            log_info("Failed to delete breach")
            handle_delete_document_error(e)

    def delete_breaches_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            ObjectiveBreachDocument.objects(  # type: ignore
                schedule=schedule_id
            ).delete()
        except Exception as e:
            log_info("Failed to delete breaches by schedule id")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_variable(dataclass_obj: Variable) -> VariableDocument:
    try:
        # pylint: disable=no-member, R0801
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get worker by id")
        handle_get_document_error(e)
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id")
        handle_get_document_error(e)
    # pylint: disable=R0801
    try:
        v_doc = VariableDocument(
            worker=worker,
            date=datetime(
                dataclass_obj.date.year,
                dataclass_obj.date.month,
                dataclass_obj.date.day,
            ),
            shift=shift,
        )
    except Exception as e:
        log_info("Failed to convert Variable to VariableDocument")
        handle_create_document_error(e)
    return v_doc


def core_to_doc_breach(
    dataclass_obj: Breach,
) -> ObjectiveBreachDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info("Failed to get schedule by id")
        handle_get_document_error(e)
    try:
        b_doc = ObjectiveBreachDocument(
            id=dataclass_obj.id,
            schedule=schedule,
            objective_id=dataclass_obj.objective_id,
            objective_category=dataclass_obj.objective_category.value,
            variables=[core_to_doc_variable(v) for v in dataclass_obj.variables],
            description=dataclass_obj.description,
            hard_to_soft=dataclass_obj.hard_to_soft,
        )
    except Exception as e:
        log_info("Failed to convert ObjectiveBreach to ObjectiveBreachDocument")
        handle_create_document_error(e)
    return b_doc


def core_to_doc_breaches(
    dataclass_objs: List[Breach],
    creating: bool = False,
) -> List[ObjectiveBreachDocument]:
    # pylint: disable=R0801
    worker_ids = list(set(v.worker_id for doc in dataclass_objs for v in doc.variables))
    # pylint: disable=no-member
    workers = {
        worker.id: worker
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
    }
    shift_ids = list(set(v.shift_id for doc in dataclass_objs for v in doc.variables))
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
        assignment_doc = ObjectiveBreachDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            schedule=schedules.get(dataclass_obj.schedule_id),
            objective_id=dataclass_obj.objective_id,
            objective_category=dataclass_obj.objective_category.value,
            variables=[
                VariableDocument(
                    worker=workers.get(v.worker_id),
                    date=datetime(v.date.year, v.date.month, v.date.day),
                    shift=shifts.get(v.shift_id),
                )
                for v in dataclass_obj.variables
            ],
            description=dataclass_obj.description,
            hard_to_soft=dataclass_obj.hard_to_soft,
        )
        out.append(assignment_doc)
    return out


# document to core
def doc_to_core_variable(doc_obj: VariableDocument) -> Variable:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["worker_id"] = doc_dict["worker"]
    doc_dict["date"] = doc_dict["date"].date()
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict.pop("worker")
    doc_dict.pop("shift")
    return Variable(**doc_dict)


def doc_to_core_breach(
    doc_obj: ObjectiveBreachDocument,
) -> Breach:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict["objective_id"] = doc_dict.get("objective_id", None)
    doc_dict["objective_category"] = ObjectiveCategory(doc_dict["objective_category"])
    doc_dict["variables"] = [doc_to_core_variable(v) for v in doc_obj.variables]
    doc_dict["hard_to_soft"] = doc_dict.get("hard_to_soft", None)
    doc_dict.pop("_id")
    doc_dict.pop("schedule")
    return Breach(**doc_dict)
