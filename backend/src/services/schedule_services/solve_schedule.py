import time
from typing import Dict, List, Tuple

from core import (
    Assignment,
    Constraint,
    ConstraintBuild,
    CoverageSelector,
    ObjectiveBreach,
    Schedule,
    Shift,
    ShiftDemand,
    Stat,
    Worker,
)
from engine import Engine
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    constraint_db,
    coverage_selector_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    shift_property_db,
    worker_db,
    worker_property_db,
)
from services.constraint_services import build_constraints
from services.schedule_services.core_to_engine import core_to_engine_inputs
from services.schedule_services.engine_to_core import engine_to_core_outputs
from services.schedule_services.inputs_processing import build_no_coverage_date
from services.schedule_services.outputs_processing import update_request_status
from services.stats_services import build_stats


# pylint: disable=too-many-locals, too-many-statements
def solve_schedule(
    schedule: Schedule,
) -> Tuple[Schedule, List[Assignment], List[ObjectiveBreach], List[Stat]]:
    start_time = time.time()
    start_time_db = time.time()
    workers = worker_db.get_workers(schedule.team_id)
    shifts = shift_db.get_shifts(schedule.team_id)
    worker_dim_dict = worker_property_db.get_workers_id_by_dim_and_prop()
    shift_dim_dict = shift_property_db.get_shifts_id_by_dim_and_prop()
    cstr_builds = constraint_build_db.get_constraint_builds_active(schedule.team_id)
    coverage_selectors = coverage_selector_db.get_coverage_selector_by_dates(
        schedule.start_date, schedule.end_date, schedule.team_id
    )
    requests = request_db.get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    team_schedules = schedule_db.get_schedules(schedule.team_id)
    prev_assignments = assignment_db.get_assignments_by_status(
        ["past", "validated"], team_schedules
    )
    wip_assignments = assignment_db.get_assignments_by_status(["wip"], team_schedules)
    end_time_db = time.time()
    start_time_engine_inputs = time.time()
    constraints = setup_constraints(
        workers,
        shifts,
        worker_dim_dict,
        shift_dim_dict,
        schedule.id,
        cstr_builds,
    )
    shift_demands = setup_shift_demands(coverage_selectors)
    inputs = core_to_engine_inputs(
        workers,
        schedule.start_date,
        schedule.end_date,
        shifts,
        shift_demands,
        requests,
        constraints,
        prev_assignments,
        wip_assignments,
    )
    end_time_engine_inputs = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_process_outputs = time.time()
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
    update_request_status(schedule, assignments)
    updated_schedule = schedule_db.update_schedule(schedule)
    updated_assignments = save_assignments(assignments, updated_schedule)
    new_objective_breaches = save_objective_breaches(
        updated_schedule, objective_breaches
    )
    end_time_update_db = time.time()
    start_time_stats = time.time()
    stats = build_stats(schedule.team_id)
    end_time_stats = time.time()
    end_time = time.time()
    # time stats
    total_time = end_time - start_time
    total_time_db = end_time_db - start_time_db
    total_time_engine_inputs = end_time_engine_inputs - start_time_engine_inputs
    total_time_engine = end_time_engine - start_time_engine
    total_time_process_outputs = end_time_process_outputs - start_time_process_outputs
    total_time_update_db = end_time_update_db - start_time_update_db
    total_time_stats = end_time_stats - start_time_stats
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
    print(
        "stats time:           "
        + f"{total_time_stats:.2f}s "
        + f"({(total_time_stats / total_time) * 100:.0f}%)"
    )
    return updated_schedule, updated_assignments, new_objective_breaches, stats


def save_assignments(
    assignments: List[Assignment], schedule: Schedule
) -> List[Assignment]:
    assignment_db.delete_assignments_by_schedule_id(schedule.id)
    if not assignments:
        return []
    out = assignment_db.create_assignments(assignments)
    return out


def save_objective_breaches(
    schedule: Schedule, objective_breaches: List[ObjectiveBreach]
) -> List[ObjectiveBreach]:
    existing_ob = objective_breach_db.get_objective_breaches_by_schedule_id(schedule.id)
    if existing_ob:
        for ob in existing_ob:
            objective_breach_db.delete_objective_breach(ob.id)
    return [
        objective_breach_db.create_objective_breach(ob) for ob in objective_breaches
    ]


# pylint: disable=too-many-arguments
def setup_constraints(
    workers: List[Worker],
    shifts: List[Shift],
    worker_dim_dict: Dict,
    shift_dim_dict: Dict,
    schedule_id: str,
    cstr_builds: List[ConstraintBuild],
) -> List[Constraint]:
    constraint_db.delete_constraints_by_schedule_id(schedule_id)
    constraints = build_constraints(
        workers,
        shifts,
        worker_dim_dict,
        shift_dim_dict,
        schedule_id,
        cstr_builds,
    )
    out = []
    for constraint in constraints:
        out.append(constraint_db.create_constraint(constraint))
    return out


def setup_shift_demands(
    coverage_selectors: List[CoverageSelector],
) -> List[List[ShiftDemand] | None]:
    out: List[List[ShiftDemand] | None] = []
    for coverage_selector in coverage_selectors:
        if coverage_selector.coverage_id == "":
            out.append(None)
            continue
        out.append(
            shift_demand_db.get_shift_demands_by_coverage_selector(coverage_selector)
        )
    return out
