from datetime import date, timedelta
from typing import List, Union

from core.constraint import Constraint, VarDay, VarShift, VarWorker
from core.coverage import Coverage, CoverageSelector
from core.fixed_assignment import FixedAssignment
from core.request import Request
from core.shift import Shift
from core.worker import Worker
from engine import Assignment as AssignmentEngine
from engine import Constraint as ConstraintEngine
from engine import Coverage as CoverageEngine
from engine import Inputs
from engine import Request as RequestEngine
from engine import ShiftDemand as ShiftDemandEngine
from engine import VarDay as VarDayEngine
from engine import VariableSpace
from engine import VarShift as VarShiftEngine
from engine import VarWorker as VarWorkerEngine
from services.schedule_services.penalty_map import penalty_map


# pylint: disable=too-many-arguments
def core_to_engine_inputs(
    workers: List[Worker],
    start_date: date,
    end_date: date,
    shifts: List[Shift],
    coverage_selectors: List[CoverageSelector],
    coverages: List[Union[Coverage, None]],
    fixed_assignments: List[FixedAssignment],
    requests: List[Request],
    constraints: List[Constraint],
) -> Inputs:
    # start_date, end_date = _get_start_end_dates(coverage_selectors)
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        start_date=start_date,
        end_date=end_date,
        shifts=[shift.id for shift in shifts],
    )
    inputs = Inputs(
        variable_space=variable_space,
        coverage=CoverageEngine(_build_shift_demands(coverage_selectors, coverages)),
        requests=[_core_to_engine_request(req) for req in requests],
        fixed_assignments=[
            AssignmentEngine(worker_id=fa.worker_id, date=fa.date, shift_id=fa.shift_id)
            for fa in fixed_assignments
        ],
        constraints=[_core_to_engine_constraint(c) for c in constraints],
    )
    return inputs


def _get_start_end_dates(
    coverage_selectors: list[CoverageSelector],
) -> tuple[date, date]:
    start_date = min(c.start_date for c in coverage_selectors)
    end_date = max(c.end_date for c in coverage_selectors)
    return start_date, end_date


def _build_shift_demands(
    coverage_selectors: List[CoverageSelector],
    coverages: List[Union[Coverage, None]],
) -> List[ShiftDemandEngine]:
    shift_demands = []
    for cs, c in zip(coverage_selectors, coverages):
        if c is None:
            continue
        for day in range((cs.end_date - cs.start_date).days + 1):
            cov_date = cs.start_date + timedelta(days=day)
            for shift_demand in c.shift_demands:
                if shift_demand.day_index == cov_date.weekday():
                    shift_demands.append(
                        ShiftDemandEngine(
                            date=cov_date,
                            shift_id=shift_demand.shift_id,
                            quantity=shift_demand.quantity,
                        )
                    )
    return shift_demands


def _core_to_engine_request(request: Request) -> RequestEngine:
    return RequestEngine(
        id=request.id,
        worker_id=request.worker_id,
        date=request.date,
        shift_id=request.shift_id,
        penalty=getattr(penalty_map.request, request.priority),
    )


def _core_to_engine_constraint(constraint: Constraint) -> ConstraintEngine:
    return ConstraintEngine(
        id=constraint.id,
        constraint_type=constraint.constraint_type,
        operator=constraint.operator,
        target_value=constraint.target_value,
        worker_var=_core_to_engine_var_worker(constraint.worker_var),
        day_var=_core_to_engine_var_day(constraint.day_var),
        shift_var=_core_to_engine_var_shift(constraint.shift_var),
        hard=constraint.hard,
        penalty=getattr(
            penalty_map.constraint,
            constraint.priority if constraint.priority != "" else "no",
        ),
    )


def _core_to_engine_var_worker(var_worker: VarWorker) -> VarWorkerEngine:
    return VarWorkerEngine(
        operator=var_worker.operator,
        selector=var_worker.selector,
        target=var_worker.target_ids,
        num_eligible_workers=var_worker.num_eligible_workers,
    )


def _core_to_engine_var_day(var_day: VarDay) -> VarDayEngine:
    return VarDayEngine(
        selector=var_day.selector,
        target=var_day.target,
        start_date=var_day.start_date,
        end_date=var_day.end_date,
        interval=var_day.interval,
    )


def _core_to_engine_var_shift(var_shift: VarShift) -> VarShiftEngine:
    return VarShiftEngine(
        operator=var_shift.operator,
        selector=var_shift.selector,
        target=var_shift.target_ids,
        reference=var_shift.reference_id,
        relative=var_shift.relative_id,
    )
