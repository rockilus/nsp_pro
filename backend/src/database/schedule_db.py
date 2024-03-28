from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.schedule import Schedule
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import Schedule as ScheduleDocument
from models import Team as TeamDocument
from services.logging import log_info


class ScheduleDB:
    def __init__(self, db: DB):
        self.db = db

    def create_schedule(self, schedule: Schedule) -> Schedule:
        s_doc = core_to_doc_schedule(schedule)
        s_doc.id = str(ObjectId())
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info(f"Failed to save schedule to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_schedule(s_saved)

    def get_schedules(self, team_id: str) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get schedules from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_schedule(c) for c in list(schedules)]

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get schedule by id from database: {e}")
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
            log_info(f"Failed to get schedules from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_schedule(s) for s in list(schedules)]

    def update_schedule(self, schedule: Schedule) -> Schedule:
        s_doc = core_to_doc_schedule(schedule)
        try:
            s_saved = s_doc.save()
        except Exception as e:
            log_info(f"Failed to update schedule to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_schedule(s_saved)

    def delete_schedule(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get schedule by id to delete from database: {e}")
            handle_get_document_error(e)
        try:
            schedule.delete()
        except Exception as e:
            log_info(f"Failed to delete schedule from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_schedule(dataclass_obj: Schedule) -> ScheduleDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get team by id for schedule: {e}")
        handle_get_document_error(e)
    try:
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
        )
    except Exception as e:
        log_info(f"Failed to convert Schedule to ScheduleDocument: {e}")
        handle_create_document_error(e)
    return s_doc


# document to core
def doc_to_core_schedule(doc_obj: ScheduleDocument) -> Schedule:
    try:
        schedule = Schedule(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            start_date=doc_obj.start_date.date(),
            end_date=doc_obj.end_date.date(),
            solve_status=doc_obj.solve_status,
            status=doc_obj.status,
            missing_coverage_dates=[
                d.date()
                for d in doc_obj.missing_coverage_dates
                if isinstance(d, datetime)
            ],
        )
    except Exception as e:
        log_info(f"Failed to convert ScheduleDocument to Schedule: {e}")
        handle_create_core_object_error(e)
    return schedule
