from datetime import date, datetime, time, timezone
from typing import List

from bson import ObjectId
from mongoengine import DoesNotExist

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.constraint_build import (
    ConstraintBuild as ConstraintBuildDocument,
)
from shared.database.models.schedule import QuickStaffing as QuickStaffingDocument
from shared.database.models.schedule import Schedule as ScheduleDocument
from shared.database.models.schedule import SolveDetails as SolveDetailsDocument
from shared.database.models.shift import Shift as ShiftDocument
from shared.database.models.team import Team as TeamDocument
from shared.database.models.worker import Worker as WorkerDocument
from shared.logger.logger import log_info
from shared.schemas.schemas.schedule import (
    QuickStaffing,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    SolveDetails,
    SolveDetailsStatus,
)


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

    def get_schedule_campaign(self, team_id: str) -> Schedule | None:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(  # type: ignore
                team=team_id, status=ScheduleStatus.CAMPAIGN.value
            )
        except DoesNotExist:
            return None
        except Exception as e:
            log_info("Failed to get campaign schedule from database")
            handle_get_document_error(e)
        return doc_to_core_schedule(schedule)

    def get_schedule_campaign_by_constraint_build_id(
        self, team_id: str, cb_id: str
    ) -> Schedule | None:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(  # type: ignore
                constraint_builds=cb_id,
                status=ScheduleStatus.CAMPAIGN.value,
                team=team_id,
            )
        except Exception as e:
            log_info(
                "Failed to get campaign schedule by constraint build id from database"
            )
            handle_get_document_error(e)
        return doc_to_core_schedule(schedule) if schedule else None

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        try:
            # pylint: disable=no-member
            schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get schedule by id from database")
            handle_get_document_error(e)
        return doc_to_core_schedule(schedule)

    def get_schedules_before_date(self, s_date: date, team_id: str) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(  # type: ignore
                end_date__lt=s_date, team=team_id
            )
        except Exception as e:
            log_info("Failed to get schedules from database")
            handle_get_document_error(e)
        return [doc_to_core_schedule(s) for s in list(schedules)]

    def get_schedule_quick_staffing_contain_shift_id(
        self, shift_id: str
    ) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(  # type: ignore
                quick_staffings__shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get schedules from database")
            handle_get_document_error(e)
        return [doc_to_core_schedule(s) for s in list(schedules)]

    def get_schedule_quick_staffing_contain_worker_id(
        self, worker_id: str
    ) -> List[Schedule]:
        try:
            # pylint: disable=no-member
            schedules = ScheduleDocument.objects.filter(  # type: ignore
                quick_staffings__worker=worker_id
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
    worker_ids = list(set(qs.worker_id for qs in dataclass_obj.quick_staffings))
    workers = {
        worker.id: worker
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
    }
    shift_ids = list(set(qs.shift_id for qs in dataclass_obj.quick_staffings))
    shifts = {
        shift.id: shift
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }

    # pylint: disable=R0801
    s_doc = ScheduleDocument(
        id=dataclass_obj.id,
        team=team,
        start_date=datetime.combine(
            dataclass_obj.start_date, time.min, timezone.utc
        ).timestamp(),
        end_date=datetime.combine(
            dataclass_obj.end_date, time.min, timezone.utc
        ).timestamp(),
        solve_details=(
            SolveDetailsDocument(
                task_id=dataclass_obj.solve_details.task_id,
                status=dataclass_obj.solve_details.status.value,
                updated_at=dataclass_obj.solve_details.updated_at.timestamp(),
                result=dataclass_obj.solve_details.result,
            )
            if dataclass_obj.solve_details
            else None
        ),
        solve_status=dataclass_obj.solve_status.value,
        status=dataclass_obj.status.value,
        missing_coverage_dates=[
            datetime.combine(dt, time.min, timezone.utc).timestamp()
            for dt in dataclass_obj.missing_coverage_dates
        ],
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


def doc_to_core_solve_details(doc_obj: SolveDetailsDocument) -> SolveDetails:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["status"] = SolveDetailsStatus(doc_dict["status"])
    doc_dict["updated_at"] = datetime.fromtimestamp(
        doc_dict["updated_at"], tz=timezone.utc
    )
    doc_dict["result"] = doc_dict.get("result", None)
    return SolveDetails(**doc_dict)


def doc_to_core_schedule(doc_obj: ScheduleDocument) -> Schedule:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["start_date"] = datetime.fromtimestamp(
        doc_dict["start_date"], timezone.utc
    ).date()
    doc_dict["end_date"] = datetime.fromtimestamp(
        doc_dict["end_date"], timezone.utc
    ).date()
    if "solve_details" in doc_dict:
        doc_dict["solve_details"] = (
            doc_to_core_solve_details(doc_obj.solve_details)
            if doc_obj.solve_details
            else None
        )
    else:
        doc_dict["solve_details"] = None
    doc_dict["solve_status"] = ScheduleSolveStatus(doc_dict["solve_status"])
    doc_dict["status"] = ScheduleStatus(doc_dict["status"])
    doc_dict["missing_coverage_dates"] = [
        datetime.fromtimestamp(dt, tz=timezone.utc).date()
        for dt in doc_dict["missing_coverage_dates"]
    ]
    doc_dict["constraint_build_ids"] = doc_dict["constraint_builds"]
    doc_dict["quick_staffings"] = [
        doc_to_core_quick_staffing(qs) for qs in doc_obj.quick_staffings
    ]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    doc_dict.pop("constraint_builds")
    return Schedule(**doc_dict)
