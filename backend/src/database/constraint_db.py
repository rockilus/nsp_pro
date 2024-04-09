from datetime import datetime
from typing import List

from bson import ObjectId

from core import Constraint, VarDay, VarShift, VarWorker
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Constraint as ConstraintDocument
from models import ConstraintBuild as ConstraintBuildDocument
from models import Schedule as ScheduleDocument
from models import Shift as ShiftDocument
from models import VarDay as VarDayDocument
from models import VarShift as VarShiftDocument
from models import VarWorker as VarWorkerDocument
from models import Worker as WorkerDocument


class ConstraintDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_constraint(self, constraint: Constraint) -> Constraint:
        constraint_doc = core_to_doc_constraint(constraint)
        constraint_doc.id = str(ObjectId())
        try:
            constraint_saved = constraint_doc.save()
        except Exception as e:
            log_info("Failed to save constraint to database")
            handle_save_document_error(e)
        return doc_to_core_constraint(constraint_saved)

    def get_constraints(self) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.all()  # type: ignore
        except Exception as e:
            log_info("Failed to get constraints from database")
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def get_constraints_active(self) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(active=True)  # type: ignore
        except Exception as e:
            log_info("Failed to get active constraints from database")
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def get_constraint_by_id(self, constraint_id: str) -> Constraint:
        try:
            # pylint: disable=no-member
            constraint = ConstraintDocument.objects.get(  # type: ignore
                id=constraint_id
            )
        except Exception as e:
            log_info("Failed to get constraint by id from database")
            handle_get_document_error(e)
        return doc_to_core_constraint(constraint)

    def get_constraints_by_worker_id(self, worker_id: str) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                worker_var__target=worker_id
            )
        except Exception as e:
            log_info("Failed to get constraints by worker id from database")
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def get_constraints_by_shift_id_in_target(self, shift_id: str) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                shift_var__target=shift_id
            )
        except Exception as e:
            log_info(
                "Failed to get constraints by shift id in constraint target "
                + "from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def get_constraints_by_shift_id_in_reference(
        self, shift_id: str
    ) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                shift_var__reference=shift_id
            )
        except Exception as e:
            log_info(
                "Failed to get constraints by shift id in constraint reference "
                + "from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def get_constraints_by_shift_id_in_relative(
        self, shift_id: str
    ) -> List[Constraint]:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                shift_var__relative=shift_id
            )
        except Exception as e:
            log_info(
                "Failed to get constraints by shift id in constraint relative "
                + "from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint(c) for c in list(constraints)]

    def update_constraint(self, constraint: Constraint) -> Constraint:
        c_doc = core_to_doc_constraint(constraint)
        try:
            # pylint: disable=no-member
            ConstraintDocument.objects.get(id=c_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Constraint with id {c_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            c_saved = c_doc.save()
        except Exception as e:
            log_info("Failed to update constraint in database")
            handle_save_document_error(e)
        return doc_to_core_constraint(c_saved)

    def delete_constraint(self, constraint_id: str) -> None:
        try:
            # pylint: disable=no-member
            constraint_doc = ConstraintDocument.objects.get(  # type: ignore
                id=constraint_id
            )
        except Exception as e:
            log_info("Failed to get constraint by id to delete")
            handle_get_document_error(e)
        try:
            constraint_doc.delete()
        except Exception as e:
            log_info("Failed to delete constraint")
            handle_delete_document_error(e)

    def delete_constraints_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get constraints by schedule id to delete")
            handle_get_document_error(e)
        try:
            for constraint in list(constraints):
                constraint.delete()
        except Exception as e:
            log_info("Failed to delete constraints")
            handle_delete_document_error(e)

    def delete_constraints_by_constraint_build_id(
        self, constraint_build_id: str
    ) -> None:
        try:
            # pylint: disable=no-member
            constraints = ConstraintDocument.objects.filter(  # type: ignore
                constraint_build=constraint_build_id
            )
        except Exception as e:
            log_info("Failed to get constraints by constraint build id to delete")
            handle_get_document_error(e)
        try:
            for constraint in list(constraints):
                constraint.delete()
        except Exception as e:
            log_info("Failed to delete constraints")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_var_worker(dataclass_obj: VarWorker) -> VarWorkerDocument:
    workers = []
    if len(dataclass_obj.target_ids) > 0:
        try:
            # pylint: disable=no-member
            workers = WorkerDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.target_ids
            )
        except Exception as e:
            log_info("Failed to get workers by id")
            handle_get_document_error(e)
    try:
        vw_doc = VarWorkerDocument(
            selector=dataclass_obj.selector,
            target=workers,
            num_eligible_workers=dataclass_obj.num_eligible_workers,
        )
    except Exception as e:
        log_info("Failed to convert VarWorker to VarWorkerDocument")
        handle_create_document_error(e)
    return vw_doc


def core_to_doc_var_day(dataclass_obj: VarDay) -> VarDayDocument:
    try:
        vd_doc = VarDayDocument(
            selector=dataclass_obj.selector,
            target=dataclass_obj.target,
            start_date=dataclass_obj.start_date,
            end_date=dataclass_obj.end_date,
            interval=dataclass_obj.interval,
        )
    except Exception as e:
        log_info("Failed to convert VarDay to VarDayDocument")
        handle_create_document_error(e)
    return vd_doc


def core_to_doc_var_shift(dataclass_obj: VarShift) -> VarShiftDocument:
    shifts = []
    reference_s = []
    relative_s = []
    if len(dataclass_obj.target_ids) > 0:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.target_ids
            )
        except Exception as e:
            log_info("Failed to get shifts by id")
            handle_get_document_error(e)
    if len(dataclass_obj.reference_ids) > 0:
        try:
            # pylint: disable=no-member
            reference_s = ShiftDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.reference_ids
            )
        except Exception as e:
            log_info("Failed to get shifts by id")
            handle_get_document_error(e)
    if len(dataclass_obj.relative_ids) > 0:
        try:
            # pylint: disable=no-member
            relative_s = ShiftDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.relative_ids
            )
        except Exception as e:
            log_info("Failed to get shifts by id")
            handle_get_document_error(e)
    try:
        vs_doc = VarShiftDocument(
            selector=dataclass_obj.selector,
            target=shifts,
            reference=reference_s,
            relative=relative_s,
        )
    except Exception as e:
        log_info("Failed to convert VarShift to VarShiftDocument")
        handle_create_document_error(e)
    return vs_doc


def core_to_doc_constraint(dataclass_obj: Constraint) -> ConstraintDocument:
    worker_var = core_to_doc_var_worker(dataclass_obj.worker_var)
    day_var = core_to_doc_var_day(dataclass_obj.day_var)
    shift_var = core_to_doc_var_shift(dataclass_obj.shift_var)
    try:
        # pylint: disable=no-member, R0801
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info("Failed to get schedule by id")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        constraint_build = (
            ConstraintBuildDocument.objects.get(  # type: ignore
                id=dataclass_obj.constraint_build_id
            )
            if dataclass_obj.constraint_build_id != ""
            else None
        )
    except Exception as e:
        log_info("Failed to get constraint build by id")
        handle_get_document_error(e)
    try:
        constraint = ConstraintDocument(
            id=dataclass_obj.id,
            constraint_type=dataclass_obj.constraint_type,
            operator=dataclass_obj.operator,
            target_value=dataclass_obj.target_value,
            target_unit=dataclass_obj.target_unit,
            worker_var=worker_var,
            day_var=day_var,
            shift_var=shift_var,
            hard=dataclass_obj.hard,
            priority=dataclass_obj.priority,
            active=dataclass_obj.active,
            schedule=schedule,
            constraint_build=constraint_build,
        )
    except Exception as e:
        log_info("Failed to convert Constraint to ConstraintDocument")
        handle_create_document_error(e)
    return constraint


# document to core
def doc_to_core_var_worker(doc_obj: VarWorkerDocument) -> VarWorker:
    try:
        var_worker = VarWorker(
            selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
            target_ids=[w.id for w in doc_obj.target],
            num_eligible_workers=doc_obj.num_eligible_workers,
        )
    except Exception as e:
        log_info("Failed to convert VarWorkerDocument to VarWorker")
        handle_create_core_object_error(e)
    return var_worker


def doc_to_core_var_day(doc_obj: VarDayDocument) -> VarDay:
    try:
        var_day = VarDay(
            selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
            target=doc_obj.target,
            start_date=datetime.combine(doc_obj.start_date, datetime.min.time()).date(),
            end_date=datetime.combine(doc_obj.end_date, datetime.min.time()).date(),
            interval=doc_obj.interval,
        )
    except Exception as e:
        log_info("Failed to convert VarDayDocument to VarDay")
        handle_create_core_object_error(e)
    return var_day


def doc_to_core_var_shift(doc_obj: VarShiftDocument) -> VarShift:
    try:
        var_shift = VarShift(
            selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
            target_ids=[s.id for s in doc_obj.target],
            reference_ids=[s.id for s in doc_obj.reference],
            relative_ids=[s.id for s in doc_obj.relative],
        )
    except Exception as e:
        log_info("Failed to convert VarShiftDocument to VarShift")
        handle_create_core_object_error(e)
    return var_shift


def doc_to_core_constraint(doc_obj: ConstraintDocument) -> Constraint:
    worker_var = doc_to_core_var_worker(doc_obj.worker_var)
    day_var = doc_to_core_var_day(doc_obj.day_var)
    shift_var = doc_to_core_var_shift(doc_obj.shift_var)
    try:
        constraint = Constraint(
            id=str(doc_obj.id),
            constraint_type=doc_obj.constraint_type,  # type: ignore
            operator=doc_obj.operator if doc_obj.operator else "",  # type: ignore
            target_value=doc_obj.target_value,
            target_unit=doc_obj.target_unit,
            worker_var=worker_var,
            day_var=day_var,
            shift_var=shift_var,
            hard=doc_obj.hard,
            priority=doc_obj.priority,
            active=doc_obj.active,
            schedule_id=str(doc_obj.schedule.id),
            constraint_build_id=(
                str(doc_obj.constraint_build.id) if doc_obj.constraint_build else ""
            ),
        )
    except Exception as e:
        log_info("Failed to convert ConstraintDocument to Constraint")
        handle_create_core_object_error(e)
    return constraint
