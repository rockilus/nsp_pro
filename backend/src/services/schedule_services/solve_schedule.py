from typing import Dict, List, Tuple

from core.constraint import Constraint, ConstraintBuild
from core.coverage import CoverageSelector, ShiftDemand
from core.schedule import Assignment, ObjectiveBreach, Schedule, Stat
from core.shift import Shift
from core.worker import Worker
from engine import Engine
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    constraint_db,
    coverage_selector_db,
    fixed_assignment_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    shift_property_db,
    worker_db,
    worker_property_db,
)
from services.constraint_services.build_constraints import build_constraints
from services.schedule_services.core_to_engine import core_to_engine_inputs
from services.schedule_services.engine_to_core import engine_to_core_outputs
from services.schedule_services.inputs_processing import build_no_coverage_date
from services.schedule_services.outputs_processing import update_far_status
from services.stats_services.stats_setup import stats_setup


# pylint: disable=too-many-locals
def solve_schedule(
    schedule: Schedule,
) -> Tuple[Schedule, List[Assignment], List[ObjectiveBreach], List[Stat]]:
    workers = worker_db.get_workers(schedule.team_id)
    shifts = shift_db.get_shifts(schedule.team_id)
    worker_dim_dict = worker_property_db.get_workers_id_by_dim_and_prop()
    shift_dim_dict = shift_property_db.get_shifts_id_by_dim_and_prop()
    cstr_builds = constraint_build_db.get_constraint_builds_active(schedule.team_id)
    constraints = setup_constraints(
        workers,
        shifts,
        worker_dim_dict,
        shift_dim_dict,
        schedule.id,
        cstr_builds,
    )
    coverage_selectors = coverage_selector_db.get_coverage_selector_by_dates(
        schedule.start_date, schedule.end_date, schedule.team_id
    )
    shift_demands = setup_shift_demands(coverage_selectors)
    fixed_assignments = fixed_assignment_db.get_fixed_assignments_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    requests = request_db.get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    prev_assignments = assignment_db.get_assignments_by_status(["past", "validated"])
    wip_assignments = assignment_db.get_assignments_by_status(["wip"])
    inputs = core_to_engine_inputs(
        workers,
        schedule.start_date,
        schedule.end_date,
        shifts,
        shift_demands,
        fixed_assignments,
        requests,
        constraints,
        prev_assignments,
        wip_assignments,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments, objective_breaches = engine_to_core_outputs(
        schedule, outputs, constraints
    )
    schedule.missing_coverage_dates = build_no_coverage_date(
        schedule.start_date,
        schedule.end_date,
        coverage_selectors,
    )
    update_far_status(schedule, assignments)
    stats = stats_setup(schedule.team_id)
    updated_schedule = schedule_db.update_schedule(schedule)
    updated_assignments = save_assignments(
        assignments, workers, shifts, updated_schedule
    )
    new_objective_breaches = save_objective_breaches(
        updated_schedule, objective_breaches
    )
    return updated_schedule, updated_assignments, new_objective_breaches, stats


def save_assignments(
    assignments: List[Assignment],
    workers: List[Worker],
    shifts: List[Shift],
    schedule: Schedule,
) -> List[Assignment]:
    existing_as = assignment_db.get_assignments_by_schedule_id(schedule.id)
    if existing_as:
        for a in existing_as:
            assignment_db.delete_assignment(a.id)
    out = []
    for a in assignments:
        worker = next((w for w in workers if w.id == a.worker_id), None)
        if worker is None:
            raise ValueError(f"Worker {a.worker_id} not found")
        shift = next((s for s in shifts if s.id == a.shift_id), None)
        if shift is None:
            raise ValueError(f"Shift {a.shift_id} not found")
        out.append(
            assignment_db.create_assignment(worker, a.date, shift, schedule, "wip")
        )
    return out


def save_objective_breaches(
    schedule: Schedule, objective_breaches: List[ObjectiveBreach]
) -> List[ObjectiveBreach]:
    existing_ob = objective_breach_db.get_objective_breaches_by_schedule_id(schedule.id)
    if existing_ob:
        for ob in existing_ob:
            objective_breach_db.delete_objective_breach(ob.id)
    return [
        objective_breach_db.create_objective_breach(ob, schedule)
        for ob in objective_breaches
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
