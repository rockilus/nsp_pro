from typing import List, Tuple, Union

from core.coverage import ShiftDemand
from core.schedule import Assignment, ObjectiveBreach, Schedule, Stat
from core.shift import Shift
from core.worker import Worker
from engine import Engine
from scripts.setup_database import (
    assignment_db,
    constraint_db,
    coverage_selector_db,
    fixed_assignment_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    worker_db,
)
from services.schedule_services.build_stats import BuildStats
from services.schedule_services.core_to_engine import core_to_engine_inputs
from services.schedule_services.engine_to_core import engine_to_core_outputs
from services.schedule_services.inputs_processing import build_no_coverage_date
from services.schedule_services.outputs_processing import update_far_status


# pylint: disable=too-many-locals
def solve_schedule(
    schedule: Schedule,
) -> Tuple[Schedule, List[Assignment], List[ObjectiveBreach], List[Stat]]:
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverage_selectors = coverage_selector_db.get_coverage_selector_by_dates(
        schedule.start_date, schedule.end_date
    )
    shift_demands: List[Union[List[ShiftDemand], None]] = []
    for coverage_selector in coverage_selectors:
        if coverage_selector.coverage_id == "":
            shift_demands.append(None)
            continue
        shift_demands.append(
            shift_demand_db.get_shift_demands_by_coverage_selector(coverage_selector)
        )
    fixed_assignments = fixed_assignment_db.get_fixed_assignments()
    requests = request_db.get_requests()
    constraints = constraint_db.get_constraints_active()
    inputs = core_to_engine_inputs(
        workers,
        schedule.start_date,
        schedule.end_date,
        shifts,
        coverage_selectors,
        shift_demands,
        fixed_assignments,
        requests,
        constraints,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments, objective_breaches = engine_to_core_outputs(
        schedule, outputs
    )
    schedule.missing_coverage_dates = build_no_coverage_date(
        inputs.variable_space.start_date,
        inputs.variable_space.end_date,
        coverage_selectors,
    )

    update_far_status(schedule, assignments)
    build_stats = BuildStats(inputs, [s.id for s in shifts if s.name == "Off"])
    stats = build_stats.build_stats(assignments)

    updated_schedule = schedule_db.update_schedule(schedule)
    updated_assignments = [
        save_assignment(a, workers, shifts, updated_schedule) for a in assignments
    ]
    new_objective_breaches = save_objective_breaches(
        updated_schedule, objective_breaches
    )
    return updated_schedule, updated_assignments, new_objective_breaches, stats


def save_assignment(
    assignment: Assignment,
    workers: List[Worker],
    shifts: List[Shift],
    schedule: Schedule,
) -> Assignment:
    worker = next((w for w in workers if w.id == assignment.worker_id), None)
    if not worker:
        raise ValueError(f"Worker {assignment.worker_id} not found")
    shift = next((s for s in shifts if s.id == assignment.shift_id), None)
    if not shift:
        raise ValueError(f"Shift {assignment.shift_id} not found")
    existing_assignment = assignment_db.get_assignment_by_worker_date_shift_schedule(
        worker, assignment.date, shift, schedule
    )
    if existing_assignment:
        assignment.id = existing_assignment.id
        return assignment_db.update_assignment(assignment)
    return assignment_db.create_assignment(worker, assignment.date, shift, schedule)


def save_objective_breaches(
    schedule: Schedule,
    objective_breaches: List[ObjectiveBreach],
) -> List[ObjectiveBreach]:
    existing_ob = objective_breach_db.get_objective_breaches_by_schedule_id(schedule.id)
    if existing_ob:
        for ob in existing_ob:
            objective_breach_db.delete_objective_breach(ob.id)
    return [
        objective_breach_db.create_objective_breach(ob, schedule)
        for ob in objective_breaches
    ]
