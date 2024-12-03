from datetime import datetime, timezone
from typing import Dict, List

from bson import ObjectId
from database.db import DB
from database.errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from database.models import Shift as ShiftDocument
from database.models import Specialty as SpecialtyDocument
from database.models import Staffing as StaffingDocument
from database.models import Team as TeamDocument
from logger import log_info
from schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType, Staffing
from schemas.errors import handle_create_schema_object_error


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

    def create_shifts(self, shifts: List[Shift]) -> List[Shift]:
        if not shifts:
            return []
        s_docs = core_to_doc_shifts(shifts, creating=True)
        try:
            # pylint: disable=no-member
            s_saved = ShiftDocument.objects.insert(s_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save shifts to database")
            handle_save_document_error(e)
        return [doc_to_core_shift(s) for s in s_saved]

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
                shift_type__in=[
                    ShiftType.NORMAL.value,
                    ShiftType.DUTY.value,
                ],
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
                shift_type__in=[
                    ShiftType.NORMAL.value,
                    ShiftType.DUTY.value,
                ],
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
                shift_type__in=[ShiftType.REST.value, ShiftType.LEAVE.value],
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

    def update_shifts(self, shifts: List[Shift]) -> List[Shift]:
        if not shifts:
            return []
        s_docs = core_to_doc_shifts(shifts)
        try:
            for s_doc in s_docs:
                s_doc.save()
        except Exception as e:
            log_info("Failed to update shifts in database")
            handle_save_document_error(e)
        return [doc_to_core_shift(s) for s in s_docs]

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

    def logical_delete_shift(self, shift_id: str) -> Shift:
        try:
            # pylint: disable=no-member
            s_doc = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get shift by id to logical delete from database")
            handle_get_document_error(e)
        try:
            s_doc.update(set__deleted=True)
        except Exception as e:
            log_info("Failed to logical delete shift from database")
            handle_save_document_error(e)
        return doc_to_core_shift(s_doc)


# Mappers
# core to document
def core_to_doc_staffing(
    dataclass_obj: Staffing, spe_id_to_spe_doc: Dict[str, SpecialtyDocument]
) -> StaffingDocument:
    try:
        s_doc = StaffingDocument(
            specialty=(
                spe_id_to_spe_doc.get(dataclass_obj.specialty_id, None)
                if dataclass_obj.specialty_id is not None
                else None
            ),
            staffing=dataclass_obj.staffing,
        )
    except Exception as e:
        log_info("Failed to convert Staffing to StaffingDocument")
        handle_create_document_error(e)
    return s_doc


def core_to_doc_shift(dataclass_obj: Shift) -> ShiftDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
        if dataclass_obj.rest_type == ShiftRestType.RECUPERATION:
            recuperation_duty = ShiftDocument.objects(  # type: ignore
                id=dataclass_obj.recuperation_duty_id
            )
        else:
            recuperation_duty = None
        if dataclass_obj.recuperation_duty_id is not None:
            recuperation_duty = ShiftDocument.objects(  # type: ignore
                id=dataclass_obj.recuperation_duty_id
            )
        specialty_ids = list(
            set(
                s.specialty_id
                for s in dataclass_obj.staffing
                if s.specialty_id is not None
            )
        )
        specialties = {
            specialty.id: specialty
            for specialty in SpecialtyDocument.objects.filter(  # type: ignore
                id__in=specialty_ids
            )
        }
    except Exception as e:
        log_info("Failed to get team by id")
        handle_get_document_error(e)
    try:
        s_doc = ShiftDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            start_time=dataclass_obj.start_time.timestamp(),
            end_time=dataclass_obj.end_time.timestamp(),
            staffing=[
                core_to_doc_staffing(staffing, specialties)
                for staffing in dataclass_obj.staffing
            ],
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


def core_to_doc_shifts(
    dataclass_objs: List[Shift], creating: bool = False
) -> List[ShiftDocument]:
    team_ids = list(set(doc.team_id for doc in dataclass_objs))
    # pylint: disable=no-member
    teams = {
        team.id: team
        for team in TeamDocument.objects.filter(id__in=team_ids)  # type: ignore
    }
    duty_ids = list(
        set(
            doc.recuperation_duty_id
            for doc in dataclass_objs
            if doc.rest_type == ShiftRestType.RECUPERATION
        )
    )
    duties = {
        duty.id: duty
        for duty in ShiftDocument.objects.filter(id__in=duty_ids)  # type: ignore
    }
    specialty_ids = list(
        set(
            s.specialty_id
            for doc in dataclass_objs
            for s in doc.staffing
            if s.specialty_id is not None
        )
    )
    # pylint: disable=R0801
    specialties = {
        specialty.id: specialty
        for specialty in SpecialtyDocument.objects.filter(  # type: ignore
            id__in=specialty_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        shift_doc = ShiftDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            team=teams.get(dataclass_obj.team_id),
            name=dataclass_obj.name,
            start_time=dataclass_obj.start_time.timestamp(),
            end_time=dataclass_obj.end_time.timestamp(),
            staffing=[
                core_to_doc_staffing(s, specialties) for s in dataclass_obj.staffing
            ],
            color=dataclass_obj.color,
            shift_type=dataclass_obj.shift_type.value,
            rest_type=dataclass_obj.rest_type.value,
            leave_type=dataclass_obj.leave_type.value,
            recuperation_time=dataclass_obj.recuperation_time,
            recuperation_duty=duties.get(dataclass_obj.recuperation_duty_id),
            deleted=dataclass_obj.deleted,
        )
        out.append(shift_doc)
    return out


# document to core
def doc_to_core_staffing(doc_obj: StaffingDocument) -> Staffing:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["specialty_id"] = doc_dict["specialty"] if doc_obj.specialty else None
    if doc_obj.specialty:
        doc_dict.pop("specialty")
    return Staffing(**doc_dict)


def doc_to_core_shift(doc_obj: ShiftDocument) -> Shift:
    try:
        shift = Shift(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            name=str(doc_obj.name) if doc_obj.name is not None else "",
            start_time=datetime.fromtimestamp(doc_obj.start_time, timezone.utc),
            end_time=datetime.fromtimestamp(doc_obj.end_time, timezone.utc),
            staffing=[doc_to_core_staffing(s) for s in doc_obj.staffing],
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
        handle_create_schema_object_error(e)
    return shift
