from datetime import datetime
from typing import List

from bson import ObjectId

from core.schedule import ObjectiveBreach, Schedule, Variable
from database.db import DB
from database.schedule_db import core_to_doc_schedule
from errors import (
    handle_create_core_object_error,
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
            objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get objective breaches by schedule id to delete")
            handle_get_document_error(e)
        try:
            for ob in objective_breaches:
                ob.delete()
        except Exception as e:
            log_info("Failed to delete objective breaches")
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


# document to core
def doc_to_core_variable(doc_var: VariableDocument) -> Variable:
    try:
        variable = Variable(
            worker_id=doc_var.worker.id,
            date=doc_var.date.date(),
            shift_id=doc_var.shift.id,
        )
    except Exception as e:
        log_info("Failed to convert VariableDocument to Variable")
        handle_create_core_object_error(e)
    return variable


def doc_to_core_objective_breach(
    doc_obj: ObjectiveBreachDocument,
) -> ObjectiveBreach:
    try:
        objective_breach = ObjectiveBreach(
            id=doc_obj.id,
            objective_id=doc_obj.objective_id,
            objective_category=doc_obj.objective_category,
            variables=[doc_to_core_variable(v) for v in doc_obj.variables],
            hard_to_soft=doc_obj.hard_to_soft,
            description=doc_obj.description,
            schedule_id=doc_obj.schedule.id,
        )
    except Exception as e:
        log_info("Failed to convert ObjectiveBreachDocument to ObjectiveBreach")
        handle_create_core_object_error(e)
    return objective_breach
