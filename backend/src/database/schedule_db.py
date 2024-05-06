from datetime import date, datetime
from typing import List

from bson import ObjectId
from core import QuickStaffing, Schedule
from database.db import DB
from errors import (
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import ConstraintBuild as ConstraintBuildDocument
from models import QuickStaffing as QuickStaffingDocument
from models import Schedule as ScheduleDocument
from models import Shift as ShiftDocument
from models import Team as TeamDocument
from models import Worker as WorkerDocument


class ScheduleDB:
    def __init__(self, db: DB):
        self.db = db

    def create_schedule(self, schedule: Schedule) -> Schedule:
        s_doc = core_to_doc_schedule(schedule)
        s_doc.id = str(ObjectId())
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info("Failed to save schedule to database")
            handle_save_document_error(e)
        return doc_to_core_schedule(s_saved)

    def get_schedules(self, team_id: str) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get schedules from database")
            handle_get_document_error(e)
        return [doc_to_core_schedule(c) for c in list(schedules)]

    def get_schedule_wip(self, team_id: str) -> Schedule:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(  # type: ignore
                team=team_id, status="wip"
            )
        except Exception as e:
            log_info("Failed to get WIP schedule from database")
            handle_get_document_error(e)
        return doc_to_core_schedule(schedule)

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get schedule by id from database")
            handle_get_document_error(e)
        return doc_to_core_schedule(schedule)

    def get_wip_validated_schedules_before_date(
        self, s_date: date, team_id: str
    ) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(  # type: ignore
                end_date__lt=s_date,
                status__in=["wip", "validated"],
                team=team_id,
            )
        except Exception as e:
            log_info("Failed to get schedules from database")
            handle_get_document_error(e)
        return [doc_to_core_schedule(s) for s in list(schedules)]

    def update_schedule(self, schedule: Schedule) -> Schedule:
        s_doc = core_to_doc_schedule(schedule)
        try:
            # pylint: disable=no-member
            ScheduleDocument.objects.get(id=s_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Schedule with id {s_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info("Failed to update schedule to database")
            handle_save_document_error(e)
        return doc_to_core_schedule(s_saved)

    def delete_schedule(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get schedule by id to delete from database")
            handle_get_document_error(e)
        try:
            schedule.delete()
        except Exception as e:
            log_info("Failed to delete schedule from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_schedule(dataclass_obj: Schedule) -> ScheduleDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    # pylint: disable=no-member
    constraint_builds = ConstraintBuildDocument.objects.filter(  # type: ignore
        id__in=dataclass_obj.constraint_build_ids
    )
    worker_ids = list(
        set(qs.worker_id for qs in dataclass_obj.quick_staffings)
    )
    workers = {
        worker.id: worker
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
    }
    shift_ids = list(set(qs.shift_id for qs in dataclass_obj.quick_staffings))
    shifts = {
        shift.id: shift
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }

    s_doc = ScheduleDocument(
        id=dataclass_obj.id,
        team=team,
        start_date=datetime(
            dataclass_obj.start_date.year,
            dataclass_obj.start_date.month,
            dataclass_obj.start_date.day,
        ),
        end_date=datetime(
            dataclass_obj.end_date.year,
            dataclass_obj.end_date.month,
            dataclass_obj.end_date.day,
        ),
        solve_status=dataclass_obj.solve_status,
        status=dataclass_obj.status,
        missing_coverage_dates=dataclass_obj.missing_coverage_dates,
        constraint_builds=constraint_builds,
        quick_staffings=[
            QuickStaffingDocument(
                worker=workers.get(qs.worker_id),
                shift=shifts.get(qs.shift_id),
                target=qs.target,
            )
            for qs in dataclass_obj.quick_staffings
        ],
    )
    return s_doc


# document to core
def doc_to_core_quick_staffing(
    doc_obj: QuickStaffingDocument,
) -> QuickStaffing:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["worker_id"] = doc_dict["worker"]
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict.pop("worker")
    doc_dict.pop("shift")
    return QuickStaffing(**doc_dict)


def doc_to_core_schedule(doc_obj: ScheduleDocument) -> Schedule:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["start_date"] = doc_dict["start_date"].date()
    doc_dict["end_date"] = doc_dict["end_date"].date()
    doc_dict["missing_coverage_dates"] = [
        d.date() for d in doc_dict["missing_coverage_dates"]
    ]
    doc_dict["constraint_build_ids"] = doc_dict["constraint_builds"]
    doc_dict["quick_staffings"] = [
        doc_to_core_quick_staffing(qs) for qs in doc_obj.quick_staffings
    ]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    doc_dict.pop("constraint_builds")
    return Schedule(**doc_dict)
    # try:
    #     schedule = Schedule(
    #         id=doc_obj.id,
    #         team_id=doc_obj.team.id,
    #         start_date=doc_obj.start_date.date(),
    #         end_date=doc_obj.end_date.date(),
    #         solve_status=doc_obj.solve_status,
    #         status=doc_obj.status,
    #         missing_coverage_dates=[
    #             d.date()
    #             for d in doc_obj.missing_coverage_dates
    #             if isinstance(d, datetime)
    #         ],
    #     )
    # except Exception as e:
    #     log_info("Failed to convert ScheduleDocument to Schedule")
    #     handle_create_core_object_error(e)
    # return schedule
