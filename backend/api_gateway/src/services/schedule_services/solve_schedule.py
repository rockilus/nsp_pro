import time

from shared.schemas import EngineInputs, Schedule, ScheduleStatus

from scripts.setup_database import assignment_db, daily_shift_demand_db, schedule_db
from services.assignment_services.assignment_services import get_fixed_assignments
from services.constraint_build_services.get_constraint_build import (
    get_active_constraint_builds_by_ids,
)
from services.data_fetching_services.fetch_data import (
    fetch_workers_shifts_dim_attributes,
)
from services.request_services import get_requests_by_dates
from services.shift_services.create_shift import create_duty_recuperation_shifts
from task_queue_service import submit_solve_problem_task


# pylint: disable=too-many-locals, too-many-statements
def solve_schedule(schedule: Schedule) -> str:
    start_time_db = time.time()
    (
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
    ) = fetch_workers_shifts_dim_attributes(schedule.team_id)
    as_hist, as_wip_fixed = get_fixed_assignments(schedule)
    cbs_augmented = get_active_constraint_builds_by_ids(
        schedule.constraint_build_ids,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
    )
    recuperation_shifts_new = create_duty_recuperation_shifts(shifts)
    shift_id_to_shift = {shift.id: shift for shift in shifts}
    for rec_shift in recuperation_shifts_new:
        shift_id_to_shift[rec_shift.id] = rec_shift
    shifts = list(shift_id_to_shift.values())
    daily_shift_demands = daily_shift_demand_db.get_daily_shift_demands_by_schedule_id(
        schedule.id
    )
    requests = get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers, shifts
    )
    team_schedules = schedule_db.get_schedules(schedule.team_id)
    wip_assignments = assignment_db.get_assignments_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.CAMPAIGN]
    )
    end_time_db = time.time()
    engine_inputs = EngineInputs(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=as_hist,
        as_wip_fixed=as_wip_fixed,
        cbs_augmented=cbs_augmented,
        daily_shift_demands=daily_shift_demands,
        requests=requests,
        wip_assignments=wip_assignments,
    )
    task_id = submit_solve_problem_task(engine_inputs)
    total_time_db = end_time_db - start_time_db
    print(f"db time:              {total_time_db:.2f}s")
    return task_id
