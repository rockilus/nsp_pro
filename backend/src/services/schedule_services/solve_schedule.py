import time
from typing import List, Tuple

from core import (
    Assignment,
    ConstraintFai,
    ConstraintFil,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    ObjectiveBreach,
    RequestAugmented,
    Schedule,
    Shift,
)
from core_to_engine_service import build_engine_inputs
from engine import Constraints as ConstraintsEngine
from engine import Engine
from scripts.setup_database import (
    assignment_db,
    coverage_selector_db,
    objective_breach_db,
    schedule_db,
    shift_demand_db,
)
from services.constraint_build_services.get_constraint_build import (
    get_active_constraint_builds_by_ids,
)
from services.data_fetching_services.fetch_data import (
    fetch_workers_shifts_dim_attributes,
)
from services.request_services import get_requests_by_dates
from services.schedule_services.assignment_services import (
    get_fixed_assignments,
    save_assignments,
)
from services.schedule_services.engine_to_core import engine_to_core_outputs
from services.schedule_services.inputs_processing import build_no_coverage_date
from services.schedule_services.outputs_processing import update_request_status
from services.shift_services.create_shift import create_duty_recuperation_shifts


# pylint: disable=too-many-locals, too-many-statements
def solve_schedule(
    schedule: Schedule,
) -> Tuple[
    Schedule,
    List[Assignment],
    List[ObjectiveBreach],
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
    fixed_assignments, wip_fixed_assignments = get_fixed_assignments(schedule)
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
    coverage_selectors = coverage_selector_db.get_coverage_selectors(schedule.id)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage_selectors(
        coverage_selectors
    )
    requests = get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers, shifts
    )
    team_schedules = schedule_db.get_schedules(schedule.team_id)
    wip_assignments = assignment_db.get_assignments_by_status(["wip"], team_schedules)
    end_time_db = time.time()
    start_time_engine_inputs = time.time()
    inputs = build_engine_inputs(
        schedule,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        fixed_assignments,
        cbs_augmented,
        coverage_selectors,
        shift_demands,
        requests,
        wip_assignments,
    )
    end_time_engine_inputs = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_process_outputs = time.time()
    constraints = _engine_to_core_constraints(inputs.constraints)
    schedule, assignments, objective_breaches = engine_to_core_outputs(
        schedule, outputs, constraints
    )
    schedule.missing_coverage_dates = build_no_coverage_date(
        schedule.start_date,
        schedule.end_date,
        coverage_selectors,
    )
    end_time_process_outputs = time.time()
    start_time_update_db = time.time()
    updated_requests = update_request_status(assignments, requests, workers, shifts)
    updated_schedule = schedule_db.update_schedule(schedule)
    updated_assignments = save_assignments(
        assignments, updated_schedule, wip_fixed_assignments
    )
    new_objective_breaches = save_objective_breaches(
        updated_schedule, objective_breaches
    )
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
        updated_requests,
        recuperation_shifts_new,
    )


def save_objective_breaches(
    schedule: Schedule, objective_breaches: List[ObjectiveBreach]
) -> List[ObjectiveBreach]:
    objective_breach_db.delete_objective_breaches_by_schedule_id(schedule.id)
    if not objective_breaches:
        return []
    out = objective_breach_db.create_objective_breaches(objective_breaches)
    return out


def _engine_to_core_constraints(
    constraints_engine: ConstraintsEngine,
) -> Constraints:
    def convert_constraint_engine(constraint_engine, constraint_cls):
        return constraint_cls(**constraint_engine.__dict__)

    return Constraints(
        sum=[
            convert_constraint_engine(c_sum, ConstraintSum)
            for c_sum in constraints_engine.sum
        ],
        seq=[
            convert_constraint_engine(c_seq, ConstraintSeq)
            for c_seq in constraints_engine.seq
        ],
        ord=[
            convert_constraint_engine(c_ord, ConstraintOrd)
            for c_ord in constraints_engine.ord
        ],
        fil=[
            convert_constraint_engine(c_fil, ConstraintFil)
            for c_fil in constraints_engine.fil
        ],
        fai=[
            convert_constraint_engine(c_fai, ConstraintFai)
            for c_fai in constraints_engine.fai
        ],
    )
