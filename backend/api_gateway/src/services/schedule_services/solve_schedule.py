import time
from typing import List, Tuple

from engine import Engine
from engine_to_core_service import engine_to_core
from scripts.setup_database import assignment_db, daily_shift_demand_db, schedule_db
from services.assignment_services.assignment_services import (
    get_fixed_assignments,
    save_assignments,
)
from services.breach_services.save_breaches import save_breaches
from services.constraint_build_services.get_constraint_build import (
    get_active_constraint_builds_by_ids,
)
from services.data_fetching_services.fetch_data import (
    fetch_workers_shifts_dim_attributes,
)
from services.request_services import get_requests_by_dates
from services.request_services.update_request import update_requests
from services.shift_services.create_shift import create_duty_recuperation_shifts

from shared.schemas import (
    Assignment,
    Breach,
    RequestAugmented,
    Schedule,
    ScheduleStatus,
    Shift,
)
from shared.schemas_to_engine_service import core_to_engine_inputs


# pylint: disable=too-many-locals, too-many-statements
def solve_schedule(
    schedule: Schedule,
) -> Tuple[
    Schedule,
    List[Assignment],
    List[Breach],
    List[RequestAugmented],
    List[Shift],
]:
    start_time = time.time()
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
    start_time_engine_inputs = time.time()
    inputs, constraints = core_to_engine_inputs(
        schedule,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        as_hist + as_wip_fixed,
        cbs_augmented,
        daily_shift_demands,
        requests,
        wip_assignments,
    )
    end_time_engine_inputs = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_process_outputs = time.time()
    schedule, a_campaign, breaches, updated_requests = engine_to_core(
        schedule,
        outputs,
        workers,
        shifts,
        daily_shift_demands,
        requests,
        constraints,
        as_hist,
    )
    end_time_process_outputs = time.time()
    start_time_update_db = time.time()
    r_augmented = update_requests(updated_requests, workers, shifts)
    updated_schedule = schedule_db.update_schedule(schedule)
    updated_assignments = save_assignments(a_campaign, updated_schedule, as_wip_fixed)
    new_objective_breaches = save_breaches(updated_schedule, breaches)
    end_time_update_db = time.time()
    end_time = time.time()
    # time stats
    total_time = end_time - start_time
    total_time_db = end_time_db - start_time_db
    total_time_engine_inputs = end_time_engine_inputs - start_time_engine_inputs
    total_time_engine = end_time_engine - start_time_engine
    total_time_process_outputs = end_time_process_outputs - start_time_process_outputs
    total_time_update_db = end_time_update_db - start_time_update_db
    print(f"total time:           {total_time:.2f}s")
    print(
        "db time:              "
        + f"{total_time_db:.2f}s "
        + f"({(total_time_db / total_time) * 100:.0f}%)"
    )
    print(
        "engine inputs time:   "
        + f"{total_time_engine_inputs:.2f}s "
        + f"({(total_time_engine_inputs / total_time) * 100:.0f}%)"
    )
    print(
        "engine time:          "
        + f"{total_time_engine:.2f}s "
        + f"({(total_time_engine / total_time) * 100:.0f}%)"
    )
    print(
        "process outputs time: "
        + f"{total_time_process_outputs:.2f}s "
        + f"({(total_time_process_outputs / total_time) * 100:.0f}%)"
    )
    print(
        "update db time:       "
        + f"{total_time_update_db:.2f}s "
        + f"({(total_time_update_db / total_time) * 100:.0f}%)"
    )
    return (
        updated_schedule,
        updated_assignments,
        new_objective_breaches,
        r_augmented,
        recuperation_shifts_new,
    )
