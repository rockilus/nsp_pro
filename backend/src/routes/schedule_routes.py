from dataclasses import asdict
from datetime import timedelta
from typing import List, Tuple

import humps
from core.coverage import Coverage
from core.schedule import Assignment, Comments, Schedule
from core.shift import Shift
from core.worker import Worker
from engine import Coverage as CoverageEngine
from engine import Custom, Engine, Inputs, Outputs
from engine import ShiftDemand as ShiftDemandEngine
from engine import VariableSpace
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter
from routes.api_model import AssignmentMessage, ScheduleMessage
from scripts.setup_database import coverage_db, shift_db, worker_db

router = APIRouter()


@router.get("/schedule")
def solver() -> ScheduleMessage:
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverages = coverage_db.get_coverages()
    inputs = from_core_to_inputs(workers, shifts, coverages)
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments = from_outputs_to_core(inputs, outputs)
    return schedule_and_assignments_to_api_msg(schedule, assignments)


def get_start_end_dates(coverages: list[Coverage]) -> tuple[str, str]:
    date_format = "%Y-%m-%d"
    start_date = min(c.date_start for c in coverages)
    end_date = max(c.date_end for c in coverages)
    return start_date.strftime(date_format), end_date.strftime(date_format)


def build_shift_demands(coverages: List[Coverage]) -> List[ShiftDemandEngine]:
    shift_demands = []
    for coverage in coverages:
        for day in range((coverage.date_end - coverage.date_start).days + 1):
            date = (coverage.date_start + timedelta(days=day)).strftime(
                "%Y-%m-%d"
            )
            for shift_demand in coverage.shift_demands:
                if shift_demand.day_index == day:
                    shift_demands.append(
                        ShiftDemandEngine(
                            date=date,
                            shift_id=shift_demand.shift_id,
                            quantity=shift_demand.quantity,
                        )
                    )
    return shift_demands


def from_core_to_inputs(
    workers: List[Worker],
    shifts: List[Shift],
    coverages: List[Coverage],
) -> Inputs:
    start_date, end_date = get_start_end_dates(coverages)
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        start_date=start_date,
        end_date=end_date,
        shifts=[shift.id for shift in shifts],
    )
    shift_demands = build_shift_demands(coverages)
    # pylint: disable=R0801
    coverage = CoverageEngine(shift_demands)
    requests = []
    fix_assignments = []
    custom = Custom(custom_constraints=[])
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
        comments=Comments([], []),
    )
    assignments = [
        Assignment(**asdict(a), id="", schedule_id="")
        for a in outputs.assignments
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
