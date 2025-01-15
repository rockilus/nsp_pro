from datetime import datetime, timedelta, timezone
from typing import Dict

from shared.schemas import (
    Schedule,
    ShiftType,
    SolveDetails,
    SolveDetailsStatus,
    WorkTimeTable,
    WorkTimeTableData,
)

from scripts.setup_database import (
    coverage_selector_db,
    daily_shift_demand_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    worker_db,
)


def update_schedule_solve_details_failure(
    schedule_id: str, error: str, task_id: str
) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.FAILURE,
        updated_at=datetime.now(timezone.utc),
        result={"error": error},
    )
    schedule.solve_details = solve_details
    schedule = schedule_db.update_schedule(schedule)
    return schedule


def update_schedule_solve_details_success(
    schedule_id: str, result: str, task_id: str
) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.SUCCESS,
        updated_at=datetime.now(timezone.utc),
        result={"output": result},
    )
    schedule.solve_details = solve_details
    schedule = schedule_db.update_schedule(schedule)
    return schedule


# pylint: disable=too-many-locals
def build_worktime_data(schedule_id: str) -> WorkTimeTable:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    workers = worker_db.get_workers_not_deleted(schedule.team_id)
    coverage_selectors = coverage_selector_db.get_coverage_selectors(schedule.id)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage_selectors(
        coverage_selectors
    )
    daily_shift_demands = daily_shift_demand_db.get_daily_shift_demands_by_schedule_id(
        schedule.id
    )

    # Params
    nb_weeks = (schedule.end_date - schedule.start_date).total_seconds() / (
        7 * 24 * 3600
    )

    dates_campaign = [
        schedule.start_date + timedelta(days=i)
        for i in range((schedule.end_date - schedule.start_date).days + 1)
    ]

    # Workers
    workers_data = WorkTimeTableData(
        hours=round(sum(worker.weekly_hours_desired for worker in workers) * nb_weeks),
        count=len(workers),
    )

    # Shift count
    shift_count: Dict[str, int] = {}

    # in coverage selectors
    for cs in coverage_selectors:
        dates_cs = dates_campaign
        if not cs.full_period:
            dates_cs = [
                date for date in dates_campaign if cs.start_date <= date <= cs.end_date
            ]
        for date in dates_cs:
            for shift_demand in shift_demands:
                if (
                    shift_demand.coverage_id == cs.coverage_id
                    and shift_demand.day_index == date.weekday()
                ):
                    if shift_demand.shift_id not in shift_count:
                        shift_count[shift_demand.shift_id] = 0
                    shift_count[shift_demand.shift_id] += 1

    # in daily shift demands
    for daily_shift_demand in daily_shift_demands:
        if daily_shift_demand.date in dates_campaign:
            if daily_shift_demand.shift_id not in shift_count:
                shift_count[daily_shift_demand.shift_id] = 0
            shift_count[daily_shift_demand.shift_id] += 1

    # Shifts
    shifts = shift_db.get_shifts_by_ids(list(shift_count.keys()))
    shifts_work_not_deleted = [
        shift
        for shift in shifts
        if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY] and not shift.deleted
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
