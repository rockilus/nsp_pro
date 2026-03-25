from datetime import date, datetime, timedelta, timezone
from typing import Dict

from openpyxl import Workbook
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    DuplicateRequest,
    DuplicateResult,
    ExportOptions,
    ExportPeriodOptions,
    Schedule,
    ScheduleStatus,
    ShiftType,
    WorkTimeTable,
    WorkTimeTableData,
)

from src.config import config
from src.services.assignment_service import AssignmentService
from src.services.base_service import BaseService
from src.services.notification_service import NotificationService
from src.utils.excel_utils import core_to_excel_schedule


class ScheduleService(BaseService):
    # pylint: disable=too-many-arguments, too-many-positional-arguments
    def __init__(
        self,
        collection: DatabaseCollections,
        assignment_service: AssignmentService,
        notification_service: NotificationService,
    ) -> None:
        super().__init__(collection)
        self.assignment_service = assignment_service
        self.notification_service = notification_service

    def get_schedule_campaign(self, team_id: str, user_id: str) -> Schedule:
        schedules = self.collection.schedule_db.get_schedules(team_id)
        schedule_campaign = next(
            (s for s in schedules if s.status == ScheduleStatus.CAMPAIGN), None
        )
        if schedule_campaign:
            return schedule_campaign
        last_date = max(s.end_date for s in schedules) if schedules else None
        today_date = date.today()
        start_date = (
            today_date
            if not last_date or last_date < today_date
            else last_date + timedelta(days=1)
        )
        end_date = start_date + timedelta(days=30)
        cbs = self.collection.constraint_build_db.get_constraint_builds(team_id)
        # Ensure created campaign duration is within allowed bounds
        self.validate_schedule_duration(start_date, end_date)

        campaign_created = self.collection.schedule_db.create_schedule(
            Schedule(
                id="",
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
                status=ScheduleStatus.CAMPAIGN,
                missing_coverage_dates=[],
                constraint_build_ids=[cb.id for cb in cbs],
                quick_staffings=[],
                created_by=user_id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        self.assignment_service.update_assignments_for_schedule_dates_change(
            schedule_new=campaign_created, schedule_old=None
        )
        return campaign_created

    def validate_schedule(self, schedule_id: str) -> Schedule:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        if not schedule:
            raise ValueError(f"Schedule with id {schedule_id} not found")
        schedule.status = ScheduleStatus.VALIDATED
        schedule.updated_at = datetime.now(timezone.utc)
        schedule = self.collection.schedule_db.update_schedule(schedule)
        # Notify all team workers that the schedule has been published
        self.notification_service.notify_schedule_published(schedule)
        return schedule

    def update_schedule(self, schedule_new: Schedule) -> Schedule:
        schedule_old = self.collection.schedule_db.get_schedule_by_id(schedule_new.id)
        # Validate duration before applying updates
        self.validate_schedule_duration(schedule_new.start_date, schedule_new.end_date)

        self.assignment_service.update_assignments_for_schedule_dates_change(
            schedule_new=schedule_new, schedule_old=schedule_old
        )
        schedule_new.updated_at = datetime.now(timezone.utc)
        return self.collection.schedule_db.update_schedule(schedule_new)

    # pylint: disable=too-many-locals
    def build_worktime_data(self, schedule_id: str) -> WorkTimeTable:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        workers = self.collection.worker_db.get_workers_not_deleted(schedule.team_id)
        shift_demands = (
            self.collection.shift_demand_new_db.get_shift_demands_by_date_range(
                team_id=schedule.team_id,
                start_date=schedule.start_date,
                end_date=schedule.end_date,
            )
        )

        # Params
        nb_weeks = ((schedule.end_date - schedule.start_date).days + 1) / 7

        # Workers
        workers_data = WorkTimeTableData(
            hours=round(
                sum(worker.weekly_hours_desired for worker in workers) * nb_weeks
            ),
            count=len(workers),
        )

        # Shift count
        shift_count: Dict[str, int] = {}

        # in shift demands
        for sd in shift_demands:
            if sd.shift_id not in shift_count:
                shift_count[sd.shift_id] = 0
            shift_count[sd.shift_id] += sd.count

        # Shifts
        shifts = self.collection.shift_db.get_shifts_by_ids(list(shift_count.keys()))
        shifts_work_not_deleted = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
            and not shift.deleted
        ]
        shifts_duration = {
            shift.id: (shift.end_time - shift.start_time).total_seconds() / 3600
            for shift in shifts_work_not_deleted
        }
        # Duties
        duties_data = WorkTimeTableData(
            hours=round(
                sum(
                    shift_count[shift.id] * shifts_duration[shift.id]
                    for shift in shifts_work_not_deleted
                    if shift.shift_type == ShiftType.DUTY
                )
            ),
            count=sum(
                shift_count[shift.id]
                for shift in shifts_work_not_deleted
                if shift.shift_type == ShiftType.DUTY
            ),
        )

        # Others
        others_data = WorkTimeTableData(
            hours=round(
                sum(
                    shift_count[shift.id] * shifts_duration[shift.id]
                    for shift in shifts_work_not_deleted
                    if shift.shift_type == ShiftType.NORMAL
                )
            ),
            count=sum(
                shift_count[shift.id]
                for shift in shifts_work_not_deleted
                if shift.shift_type == ShiftType.NORMAL
            ),
        )

        return WorkTimeTable(
            workers=workers_data,
            duties=duties_data,
            others=others_data,
            nb_weeks=nb_weeks,
        )

    def delete_schedule(self, schedule_id: str) -> None:
        self.collection.assignment_db.delete_assignments_by_schedule_id(schedule_id)
        self.collection.breach_db.delete_breaches_by_schedule_id(schedule_id)
        # fmt: off
        self.collection.shift_demand_exclusion_db\
            .delete_shift_demand_exclusions_by_schedule_id(
                schedule_id=schedule_id
            )
        # fmt: on
        self.collection.schedule_db.delete_schedule(schedule_id)

    def export_schedule_to_excel(
        self, team_id: str, export_options: ExportOptions
    ) -> Workbook:
        workers = self.collection.worker_db.get_workers(team_id)
        shifts = self.collection.shift_db.get_shifts(team_id)
        if export_options.period_option == ExportPeriodOptions.ALL:
            assignments = self.collection.assignment_db.get_assignments(team_id)
            today_date = date.today()
            if assignments:
                start_date = min(assignment.date for assignment in assignments)
                end_date = max(assignment.date for assignment in assignments)
            else:
                start_date = today_date
                end_date = start_date
            dates = [
                start_date + timedelta(days=i)
                for i in range((end_date - start_date).days + 1)
            ]
        else:
            assignments = self.collection.assignment_db.get_assignments_by_dates(
                team_id, export_options.start_date, export_options.end_date
            )
            dates = [
                export_options.start_date + timedelta(days=i)
                for i in range(
                    (export_options.end_date - export_options.start_date).days + 1
                )
            ]
        wb = core_to_excel_schedule(workers, shifts, assignments, dates)

        return wb

    @staticmethod
    def _validate_duplicate(duplicate: DuplicateRequest, campaign: Schedule) -> None:
        if not (
            duplicate.target_period.start_date <= duplicate.target_period.end_date
            and duplicate.target_period.start_date >= campaign.start_date
            and duplicate.target_period.end_date <= campaign.end_date
        ):
            raise ValueError("The target period is outside the campaign period")

        # Check that the target period is at most 7 days long
        if (
            (duplicate.target_period.end_date - duplicate.target_period.start_date).days
            + 1
        ) > 7:
            raise ValueError("The target period must be at most 7 days long")

        # Check that the source period is exactly 7 days long and starts on a Monday
        if (
            (duplicate.source_period.end_date - duplicate.source_period.start_date).days
            + 1
        ) != 7 or duplicate.source_period.start_date.weekday() != 0:
            raise ValueError(
                "The source period must be exactly 7 days long and start on a Monday"
            )
        # Check that the taget period is not in the source period
        if (
            duplicate.target_period.start_date <= duplicate.source_period.end_date
            and duplicate.target_period.end_date >= duplicate.source_period.start_date
        ):
            raise ValueError(
                "The target period must not overlap with the source period"
            )

    def duplicate_period(
        self, schedule_id: str, duplicate: DuplicateRequest
    ) -> DuplicateResult:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        if not schedule:
            raise ValueError(f"Schedule with id {schedule_id} not found")
        if schedule.status != ScheduleStatus.CAMPAIGN:
            raise ValueError(
                f"Schedule with id {schedule_id} is not in campaign status"
            )
        self._validate_duplicate(duplicate=duplicate, campaign=schedule)
        duplicate_result = DuplicateResult(assignments=None, demands=None)
        if duplicate.options.copy_assignments:
            ar_result = self.assignment_service.duplicate_period(
                campaign=schedule, duplicate=duplicate
            )
            duplicate_result.assignments = ar_result
        if duplicate.options.copy_demands:
            print("Duplicating demands not implemented yet")
        return duplicate_result

    @staticmethod
    def validate_schedule_duration(start_date: date, end_date: date) -> None:
        """Validate that the period between start_date and end_date is within
        the allowed maximum schedule duration.

        Raises:
            ValueError: if the duration exceeds MAX_SCHEDULE_DURATION_MONTHS.
        """
        max_end = start_date + timedelta(days=config.max_schedule_duration_months * 30)
        if end_date > max_end:
            raise ValueError(
                "Schedule duration must be at most "
                + f"{config.max_schedule_duration_months} months"
            )
