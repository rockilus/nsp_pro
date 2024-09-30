from typing import List

from bson import ObjectId

from core import Shift, ShiftLeaveType, ShiftRestType, ShiftType
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Shift as ShiftDocument
from models import Team as TeamDocument


class ShiftDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift(self, shift: Shift) -> Shift:
        s_doc = core_to_doc_shift(shift)
        s_doc.id = str(ObjectId())
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info("Failed to save shift to database")
            handle_save_document_error(e)
        return doc_to_core_shift(s_saved)

    def get_shifts(self, team_id: str) -> List[Shift]:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get all shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_shift(s) for s in list(shifts)]

    def get_shifts_not_deleted(self, team_id: str) -> List[Shift]:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects(team=team_id, deleted=False)  # type: ignore
        except Exception as e:
            log_info("Failed to get all shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_shift(s) for s in list(shifts)]

    def get_work_shifts(self, team_id: str) -> List[Shift]:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects(  # type: ignore
                team=team_id,
                shift_type__in=[0, 1],  # ShiftType.NORMAL, ShiftType.DUTY
            )
        except Exception as e:
            log_info("Failed to get shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_shift(s) for s in list(shifts)]

    def get_work_shifts_not_deleted(self, team_id: str) -> List[Shift]:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects(  # type: ignore
                team=team_id,
                shift_type__in=[0, 1],  # ShiftType.NORMAL, ShiftType.DUTY
                deleted=False,
            )
        except Exception as e:
            log_info("Failed to get shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_shift(s) for s in list(shifts)]

    def get_rest_shifts(self, team_id: str) -> List[Shift]:
        try:
            # pylint: disable=no-member
            shifts = ShiftDocument.objects(  # type: ignore
                team=team_id,
                shift_type__in=[2, 3],  # ShiftType.REST, ShiftType.LEAVE
            )
        except Exception as e:
            log_info("Failed to get rest shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_shift(s) for s in list(shifts)]

    def get_shift_by_id(self, shift_id: str) -> Shift:
        try:
            # pylint: disable=no-member
            shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get shift by id from database")
            handle_get_document_error(e)
        return doc_to_core_shift(shift)

    def update_shift(self, shift: Shift) -> Shift:
        s_doc = core_to_doc_shift(shift)
        try:
            # pylint: disable=no-member
            ShiftDocument.objects.get(id=s_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Shift with id {s_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info("Failed to update shift in database")
            handle_save_document_error(e)
        return doc_to_core_shift(s_saved)

    def delete_shift(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get shift by id to delete from database")
            handle_get_document_error(e)
        try:
            shift.delete()
        except Exception as e:
            log_info("Failed to delete shift from database")
            handle_delete_document_error(e)

    def logical_delete_shift(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get shift by id to logical delete from database")
            handle_get_document_error(e)
        try:
            shift.update(set__deleted=True)
        except Exception as e:
            log_info("Failed to logical delete shift from database")
            handle_save_document_error(e)


# Mappers
# core to document
def core_to_doc_shift(dataclass_obj: Shift) -> ShiftDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
        recuperation_duty = None
        if dataclass_obj.recuperation_duty_id is not None:
            recuperation_duty = ShiftDocument.objects(  # type: ignore
                id=dataclass_obj.recuperation_duty_id
            )
    except Exception as e:
        log_info("Failed to get team by id")
        handle_get_document_error(e)
    try:
        s_doc = ShiftDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            start_time=dataclass_obj.start_time,
            end_time=dataclass_obj.end_time,
            staffing=dataclass_obj.staffing,
            color=dataclass_obj.color,
            shift_type=dataclass_obj.shift_type.value,
            rest_type=dataclass_obj.rest_type.value,
            leave_type=dataclass_obj.leave_type.value,
            recuperation_time=dataclass_obj.recuperation_time,
            recuperation_duty=recuperation_duty,
            deleted=dataclass_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert Shift to ShiftDocument")
        handle_create_document_error(e)
    return s_doc


# document to core
def doc_to_core_shift(doc_obj: ShiftDocument) -> Shift:
    try:
        shift = Shift(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            name=str(doc_obj.name) if doc_obj.name is not None else "",
            start_time=doc_obj.start_time,
            end_time=doc_obj.end_time,
            staffing=doc_obj.staffing,
            color=doc_obj.color,
            shift_type=ShiftType(doc_obj.shift_type),
            rest_type=ShiftRestType(doc_obj.rest_type),
            leave_type=ShiftLeaveType(doc_obj.leave_type),
            recuperation_time=doc_obj.recuperation_time,
            recuperation_duty_id=(
                str(doc_obj.recuperation_duty.id)
                if doc_obj.recuperation_duty is not None
                else None
            ),
            deleted=doc_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert ShiftDocument to Shift")
        handle_create_core_object_error(e)
    return shift
