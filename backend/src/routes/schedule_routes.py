from dataclasses import asdict
from datetime import date, timedelta
from typing import List, Tuple

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from core.coverage import CoverageSelector
from core.schedule import Assignment, Comments, Schedule
from core.shift import Shift
from core.worker import Worker
from engine import Assignment as AssignmentEngine
from engine import Coverage as CoverageEngine
from engine import Custom, Engine, Inputs, Outputs, Request
from engine import ShiftDemand as ShiftDemandEngine
from engine import VariableSpace
from routes.api_model import AssignmentMessage, ScheduleMessage
from scripts.setup_database import (
    coverage_db,
    coverage_selector_db,
    shift_db,
    worker_db,
)

router = APIRouter()


@router.get("/schedule")
def solver() -> ScheduleMessage:
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverage_selectors = coverage_selector_db.get_coverage_selectors()
    inputs = from_core_to_inputs(workers, shifts, coverage_selectors)
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments = from_outputs_to_core(inputs, outputs)
    no_cov_date = build_no_coverage_date(
        inputs.variable_space.start_date,
        inputs.variable_space.end_date,
        coverage_selectors,
    )
    schedule.comments.missing_coverage_dates = no_cov_date
    return schedule_and_assignments_to_api_msg(schedule, assignments)


def get_start_end_dates(
    coverage_selectors: list[CoverageSelector],
) -> tuple[date, date]:
    start_date = min(c.start_date for c in coverage_selectors)
    end_date = max(c.end_date for c in coverage_selectors)
    return start_date, end_date


def build_shift_demands(
    coverage_selectors: List[CoverageSelector],
) -> List[ShiftDemandEngine]:
    shift_demands = []
    for coverage_selector in coverage_selectors:
        if coverage_selector.coverage_id == "":
            continue
        coverage = coverage_db.get_coverage_by_id(coverage_selector.coverage_id)
        for day in range(
            (coverage_selector.end_date - coverage_selector.start_date).days + 1
        ):
            cov_date = coverage_selector.start_date + timedelta(days=day)
            for shift_demand in coverage.shift_demands:
                if shift_demand.day_index == cov_date.weekday():
                    shift_demands.append(
                        ShiftDemandEngine(
                            date=cov_date.strftime("%Y-%m-%d"),
                            shift_id=shift_demand.shift_id,
                            quantity=shift_demand.quantity,
                        )
                    )
    return shift_demands


def build_no_coverage_date(
    start_date: date,
    end_date: date,
    coverage_selectors: List[CoverageSelector],
) -> List[date]:
    delta = end_date - start_date
    no_cov_date = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
    for coverage_selector in coverage_selectors:
        for day in range(
            (coverage_selector.end_date - coverage_selector.start_date).days + 1
        ):
            cov_date = coverage_selector.start_date + timedelta(days=day)
            if cov_date in no_cov_date:
                no_cov_date.remove(cov_date)
                if len(no_cov_date) == 0:
                    return []
    return no_cov_date


def from_core_to_inputs(
    workers: List[Worker],
    shifts: List[Shift],
    coverage_selectors: List[CoverageSelector],
) -> Inputs:
    start_date, end_date = get_start_end_dates(coverage_selectors)
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        start_date=start_date,
        end_date=end_date,
        shifts=[shift.id for shift in shifts],
    )
    shift_demands = build_shift_demands(coverage_selectors)
    # pylint: disable=R0801
    coverage = CoverageEngine(shift_demands)
    requests: List[Request] = []
    fix_assignments: List[AssignmentEngine] = []
    custom = Custom(constraints_sum=[], constraints_ord=[], constraints_seq=[])
    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    return inputs


def from_outputs_to_core(
    inputs: Inputs, outputs: Outputs
) -> Tuple[Schedule, List[Assignment]]:
    schedule = Schedule(
        id="",
        start_date=inputs.variable_space.start_date,
        end_date=inputs.variable_space.end_date,
        comments=Comments(
            constraint_breaches=[],
            missing_coverage_dates=[],
        ),
    )
    assignments = [
        Assignment(**asdict(a), id="", schedule_id="") for a in outputs.assignments
    ]
    return schedule, assignments


def assignment_to_api_msg(
    assignment: Assignment,
) -> AssignmentMessage:
    data = asdict(assignment)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentMessage)
    return validator.validate_python(as_dict)


def schedule_and_assignments_to_api_msg(
    schedule: Schedule, assignments: List[Assignment]
) -> ScheduleMessage:
    assignments_message = [assignment_to_api_msg(a) for a in assignments]
    data = asdict(schedule)
    data["assignments"] = assignments_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ScheduleMessage)
    return validator.validate_python(as_dict)


def api_msg_to_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "assignments"}
    return Schedule(**data_snake)
