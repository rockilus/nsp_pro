from datetime import date, datetime, timedelta, timezone
from typing import Callable, Dict, List, Tuple

from celery import Celery  # type: ignore
from celery.result import AsyncResult  # type: ignore
from openpyxl import Workbook
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    CoverageSelector,
    DSDSourceType,
    ExportOptions,
    ExportPeriodOptions,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    ShiftType,
    SolveDetails,
    SolveDetailsStatus,
    WorkTimeTable,
    WorkTimeTableData,
)

from src.config import config
from src.services.assignment_service import AssignmentService
from src.services.base_service import BaseService
from src.utils.excel_utils import core_to_excel_schedule


class ScheduleService(BaseService):
    def __init__(
        self,
        collection: DatabaseCollections,
        celery_app: Celery,
        submit_solve_problem_task: Callable[[Schedule], str],
        assignment_service: AssignmentService,
    ) -> None:
        super().__init__(collection)
        self.celery_app = celery_app
        self.submit_solve_problem_task = submit_solve_problem_task
        self.assignment_service = assignment_service

    def get_schedule_campaign(self, team_id: str) -> Schedule:
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
        return self.collection.schedule_db.create_schedule(
            Schedule(
                id="",
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
                last_modified_dates=datetime.now(timezone.utc),
                solve_details=None,
                solve_status=ScheduleSolveStatus.NOT_SOLVED,
                status=ScheduleStatus.CAMPAIGN,
                missing_coverage_dates=[],
                constraint_build_ids=[cb.id for cb in cbs],
                quick_staffings=[],
                last_updated_dsds=None,
            )
        )

    def solve_schedule(self, schedule_id: str) -> Schedule:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        if schedule.solve_details and schedule.solve_details.status in [
            SolveDetailsStatus.PENDING,
            SolveDetailsStatus.STARTED,
            SolveDetailsStatus.RETRY,
        ]:
            async_result = AsyncResult(
                schedule.solve_details.task_id, app=self.celery_app
            )
            # test_status = async_result.status
            # test_task_id = schedule.solve_details.task_id

            async_result_ok = True
            try:
                async_result.status
            except Exception:
                async_result_ok = False

            if async_result_ok:
                try:
                    string = (
                        f"Task {schedule.solve_details.task_id} is "
                        + f"{async_result.status}"
                    )
                    print(string)
                    if not async_result.ready():
                        if datetime.now(
                            tz=timezone.utc
                        ) - schedule.solve_details.updated_at > timedelta(
                            seconds=config.task_expiration
                        ):
                            async_result.revoke()
                            # schedule.solve_details.status = SolveDetailsStatus.FAILURE
                            # schedule.solve_details.updated_at = datetime.now(
                            #     tz=timezone.utc
                            # )
                            # schedule = schedule_db.update_schedule(schedule)
                        else:
                            raise ValueError(
                                f"Schedule is already being solved: {string}"
                            )
                except Exception as e:
                    print(e)
                    raise ValueError(
                        f"Error with task {schedule.solve_details.task_id} and "
                        + "async_result:",
                        e,
                    ) from e
        task_id = self.submit_solve_problem_task(schedule)
        schedule.solve_details = SolveDetails(
            task_id=task_id,
            status=SolveDetailsStatus.PENDING,
            updated_at=datetime.now(tz=timezone.utc),
            result=None,
        )
        schedule = self.collection.schedule_db.update_schedule(schedule)
        return schedule

    def validate_schedule(self, schedule_id: str) -> Schedule:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        if not schedule:
            raise ValueError(f"Schedule with id {schedule_id} not found")
        if schedule.status == ScheduleSolveStatus.NOT_SOLVED:
            raise ValueError(f"Schedule with id {schedule_id} not solved")
        schedule.status = ScheduleStatus.VALIDATED
        schedule = self.collection.schedule_db.update_schedule(schedule)
        return schedule

    def update_schedule(
        self,
        schedule_new: Schedule,
    ) -> Tuple[Schedule, List[CoverageSelector]]:
        schedule_old = self.collection.schedule_db.get_schedule_by_id(schedule_new.id)
        css_updated: List[CoverageSelector] = []
        if (
            schedule_old.start_date != schedule_new.start_date
            or schedule_old.end_date != schedule_new.end_date
        ):
            schedule_new.last_modified_dates = datetime.now(timezone.utc)
            # fmt: off
            css_full_period = self.collection.coverage_selector_db\
                .get_coverage_selectors_by_schedule_id_full_period(
                    schedule_new.id
                )
            # fmt: on
            for cs in css_full_period:
                cs.start_date = schedule_new.start_date
                cs.end_date = schedule_new.end_date
            css_updated = (
                self.collection.coverage_selector_db.update_coverage_selectors(
                    css_full_period
                )
            )
        return (
            self.collection.schedule_db.update_schedule(schedule_new),
            css_updated,
        )

    def update_schedule_solve_details_failure(
        self, schedule_id: str, error: str, task_id: str
    ) -> Schedule:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        solve_details = SolveDetails(
            task_id=task_id,
            status=SolveDetailsStatus.FAILURE,
            updated_at=datetime.now(timezone.utc),
            result={"error": error},
        )
        schedule.solve_details = solve_details
        schedule = self.collection.schedule_db.update_schedule(schedule)
        return schedule

    def update_schedule_solve_details_success(
        self, schedule_id: str, result: str, task_id: str
    ) -> Schedule:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        solve_details = SolveDetails(
            task_id=task_id,
            status=SolveDetailsStatus.SUCCESS,
            updated_at=datetime.now(timezone.utc),
            result={"output": result},
        )
        schedule.solve_details = solve_details
        schedule = self.collection.schedule_db.update_schedule(schedule)
        return schedule

    # pylint: disable=too-many-locals
    def build_worktime_data(self, schedule_id: str) -> WorkTimeTable:
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        workers = self.collection.worker_db.get_workers_not_deleted(schedule.team_id)
        coverage_selectors = (
            self.collection.coverage_selector_db.get_coverage_selectors(schedule.id)
        )
        shift_demands = (
            self.collection.shift_demand_db.get_shift_demands_by_coverage_ids(
                [cs.coverage_id for cs in coverage_selectors if cs.coverage_id]
            )
        )
        # fmt: off
        daily_shift_demands = self.collection.daily_shift_demand_db\
            .get_daily_shift_demands_by_schedule_id(
                schedule.id
            )
        # fmt: on

        # Params
        nb_weeks = ((schedule.end_date - schedule.start_date).days + 1) / 7

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        # Workers
        workers_data = WorkTimeTableData(
            hours=round(
                sum(worker.weekly_hours_desired for worker in workers) * nb_weeks
            ),
            count=len(workers),
        )

        # Shift count
        shift_count: Dict[str, int] = {}

        # in coverage selectors
        for cs in coverage_selectors:
            dates_cs = dates_campaign
            if not cs.full_period:
                dates_cs = [
                    date
                    for date in dates_campaign
                    if cs.start_date <= date <= cs.end_date
                ]
            for current_date in dates_cs:
                for shift_demand in shift_demands:
                    if (
                        shift_demand.coverage_id == cs.coverage_id
                        and shift_demand.day_index == current_date.weekday()
                    ):
                        if shift_demand.shift_id not in shift_count:
                            shift_count[shift_demand.shift_id] = 0
                        shift_count[shift_demand.shift_id] += 1

        # in daily shift demands
        for dsd in daily_shift_demands:
            if (
                dsd.date in dates_campaign
                and dsd.source_type != DSDSourceType.SHIFT_DEMAND
            ):
                if dsd.shift_id not in shift_count:
                    shift_count[dsd.shift_id] = 0
                shift_count[dsd.shift_id] += dsd.count

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
        self.collection.daily_shift_demand_db.delete_daily_shift_demands_by_schedule_id(
            schedule_id
        )
        self.collection.schedule_db.delete_schedule(schedule_id)

    def export_schedule_to_excel(
        self, team_id: str, export_options: ExportOptions
    ) -> Workbook:
        workers = self.collection.worker_db.get_workers(team_id)
        shifts = self.collection.shift_db.get_shifts(team_id)
        if export_options.period_option == ExportPeriodOptions.ALL:
            assignments = self.collection.assignment_db.get_assignments(team_id)
            start_date = min(assignment.date for assignment in assignments)
            end_date = max(assignment.date for assignment in assignments)
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
