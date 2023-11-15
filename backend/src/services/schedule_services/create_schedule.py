from typing import List, Tuple, Union

from core.coverage import ShiftDemand
from core.schedule import Assignment, Schedule, ScheduleOptions
from engine import Engine
from scripts.setup_database import (
    constraint_db,
    coverage_selector_db,
    fixed_assignment_db,
    request_db,
    shift_db,
    shift_demand_db,
    worker_db,
)
from services.schedule_services.core_to_engine import core_to_engine_inputs
from services.schedule_services.engine_to_core import engine_to_core_outputs
from services.schedule_services.inputs_processing import build_no_coverage_date
from services.schedule_services.outputs_processing import update_far_status


# pylint: disable=too-many-locals
def create_schedule(
    schedule_options: ScheduleOptions,
) -> Tuple[Schedule, List[Assignment]]:
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverage_selectors = coverage_selector_db.get_coverage_selector_by_dates(
        schedule_options.start_date, schedule_options.end_date
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
        schedule_options.start_date,
        schedule_options.end_date,
        shifts,
        coverage_selectors,
        shift_demands,
        fixed_assignments,
        requests,
        constraints,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments = engine_to_core_outputs(inputs, outputs)
    no_cov_date = build_no_coverage_date(
        inputs.variable_space.start_date,
        inputs.variable_space.end_date,
        coverage_selectors,
    )
    schedule.comments.missing_coverage_dates = no_cov_date
    update_far_status(schedule, assignments)
    return schedule, assignments
