from datetime import datetime
from typing import List

from bson import ObjectId

from core import ObjectiveBreach, Schedule, Variable
from database.db import DB
from database.schedule_db import core_to_doc_schedule
from errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models.objective_breach import ObjectiveBreach as ObjectiveBreachDocument
from models.objective_breach import Variable as VariableDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class ObjectiveBreachDB:
    def __init__(self, db: DB):
        self.db = db

    def create_objective_breach(
        self, objective_breach: ObjectiveBreach
    ) -> ObjectiveBreach:
        ob_doc = core_to_doc_objective_breach(objective_breach)
        ob_doc.id = str(ObjectId())
        try:
            ob_saved = ob_doc.save()
        except Exception as e:
            log_info("Failed to save objective breach to database")
            handle_save_document_error(e)
        return doc_to_core_objective_breach(ob_saved)

    def create_objective_breaches(
        self, objective_breaches: List[ObjectiveBreach]
    ) -> List[ObjectiveBreach]:
        try:
            ob_docs = core_to_doc_objective_breaches(objective_breaches, creating=True)
        except Exception as e:
            log_info("Failed to convert ObjectBreaches to ObjectiveBreachDocuments")
            handle_create_document_error(e)
        try:
            # pylint: disable=no-member
            ob_saved = ObjectiveBreachDocument.objects.insert(ob_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save assignments to database")
            handle_save_document_error(e)
        return [doc_to_core_objective_breach(a) for a in ob_saved]

    def get_objective_breaches(
        self, schedules: List[Schedule]
    ) -> List[ObjectiveBreach]:
        s_docs = [core_to_doc_schedule(s) for s in schedules]
        try:
            # pylint: disable=no-member
            objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                schedule__in=s_docs
            )
        except Exception as e:
            log_info("Failed to get objective breaches from database")
            handle_get_document_error(e)
        return [doc_to_core_objective_breach(ob) for ob in list(objective_breaches)]

    def get_objective_breach_by_id(self, objective_breach_id: str) -> ObjectiveBreach:
        try:
            # pylint: disable=no-member
            objective_breach = ObjectiveBreachDocument.objects.get(  # type: ignore
                id=objective_breach_id
            )
        except Exception as e:
            log_info("Failed to get objective breach by id from database")
            handle_get_document_error(e)
        return doc_to_core_objective_breach(objective_breach)

    def get_objective_breaches_by_schedule_id(
        self, schedule_id: str
    ) -> List[ObjectiveBreach]:
        try:
            # pylint: disable=no-member
            objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get objective breaches by schedule id from database")
            handle_get_document_error(e)
        return [doc_to_core_objective_breach(ob) for ob in list(objective_breaches)]

    def get_objective_breaches_by_worker_id(
        self, worker_id: str
    ) -> List[ObjectiveBreach]:
        try:
            # pylint: disable=no-member
            objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                variables__worker=worker_id
            )
        except Exception as e:
            log_info("Failed to get objective breaches by worker id from database")
            handle_get_document_error(e)
        return [doc_to_core_objective_breach(ob) for ob in list(objective_breaches)]

    def get_objective_breaches_by_shift_id(
        self, shift_id: str
    ) -> List[ObjectiveBreach]:
        try:
            # pylint: disable=no-member
            objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                variables__shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get objective breaches by shift id from database")
            handle_get_document_error(e)
        return [doc_to_core_objective_breach(ob) for ob in list(objective_breaches)]

    def update_objective_breach(
        self, objective_breach: ObjectiveBreach
    ) -> ObjectiveBreach:
        ob_doc = core_to_doc_objective_breach(objective_breach)
        try:
            # pylint: disable=no-member
            ObjectiveBreachDocument.objects.get(id=ob_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Objective breach with id {ob_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            ob_saved = ob_doc.save()
        except Exception as e:
            log_info("Failed to update objective breach")
            handle_save_document_error(e)
        return doc_to_core_objective_breach(ob_saved)

    def delete_objective_breach(self, objective_breach_id: str) -> None:
        try:
            # pylint: disable=no-member
            objective_breach = ObjectiveBreachDocument.objects.get(  # type: ignore
                id=objective_breach_id
            )
        except Exception as e:
            log_info("Failed to get objective breach by id to delete")
            handle_get_document_error(e)
        try:
            objective_breach.delete()
        except Exception as e:
            log_info("Failed to delete objective breach")
            handle_delete_document_error(e)

    def delete_objective_breaches_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            ObjectiveBreachDocument.objects(  # type: ignore
                schedule=schedule_id
            ).delete()
        except Exception as e:
            log_info("Failed to delete objective breaches by schedule id")
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


def core_to_doc_objective_breach(
    dataclass_obj: ObjectiveBreach,
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
        ob_doc = ObjectiveBreachDocument(
            id=dataclass_obj.id,
            objective_id=dataclass_obj.objective_id,
            objective_category=dataclass_obj.objective_category,
            variables=[core_to_doc_variable(v) for v in dataclass_obj.variables],
            hard_to_soft=dataclass_obj.hard_to_soft,
            description=dataclass_obj.description,
            schedule=schedule,
        )
    except Exception as e:
        log_info("Failed to convert ObjectiveBreach to ObjectiveBreachDocument")
        handle_create_document_error(e)
    return ob_doc


def core_to_doc_objective_breaches(
    dataclass_objs: List[ObjectiveBreach],
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
            objective_id=dataclass_obj.objective_id,
            objective_category=dataclass_obj.objective_category,
            variables=[
                VariableDocument(
                    worker=workers.get(v.worker_id),
                    date=datetime(v.date.year, v.date.month, v.date.day),
                    shift=shifts.get(v.shift_id),
                )
                for v in dataclass_obj.variables
            ],
            hard_to_soft=dataclass_obj.hard_to_soft,
            description=dataclass_obj.description,
            schedule=schedules.get(dataclass_obj.schedule_id),
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


def doc_to_core_objective_breach(
    doc_obj: ObjectiveBreachDocument,
) -> ObjectiveBreach:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["variables"] = [doc_to_core_variable(v) for v in doc_obj.variables]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict.pop("_id")
    doc_dict.pop("schedule")
    return ObjectiveBreach(**doc_dict)
