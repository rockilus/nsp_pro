from datetime import date, timedelta
from typing import List, Union

from core.coverage import Coverage, CoverageSelector
from core.fixed_assignment import FixedAssignment
from core.request import Request
from core.shift import Shift
from core.worker import Worker
from engine import Assignment as AssignmentEngine
from engine import Coverage as CoverageEngine
from engine import Constraint, Inputs
from engine import Request as RequestEngine
from engine import ShiftDemand as ShiftDemandEngine
from engine import VariableSpace
from services.schedule_services.penalty_map import penalty_map


# pylint: disable=too-many-arguments
def from_core_to_inputs(
    workers: List[Worker],
    shifts: List[Shift],
    coverage_selectors: List[CoverageSelector],
    coverages: List[Union[Coverage, None]],
    fixed_assignments: List[FixedAssignment],
    requests: List[Request],
) -> Inputs:
    start_date, end_date = _get_start_end_dates(coverage_selectors)
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        start_date=start_date,
        end_date=end_date,
        shifts=[shift.id for shift in shifts],
    )
    shift_demands_engine = _build_shift_demands(coverage_selectors, coverages)
    # pylint: disable=R0801
    cov_engine = CoverageEngine(shift_demands_engine)
    req_engine = [_build_request_engine(req) for req in requests]
    fa_engine = [
        AssignmentEngine(
            worker_id=fa.worker_id, date=fa.date, shift_id=fa.shift_id
        )
        for fa in fixed_assignments
    ]
    custom_engine = Constraint(
        constraints_sum=[],
        constraints_ord=[],
        constraints_seq=[],
        constraints_fil=[],
        constraints_fai=[],
        constraints_eve=[],
    )
    inputs = Inputs(
        variable_space=variable_space,
        coverage=cov_engine,
        requests=req_engine,
        fixed_assignments=fa_engine,
        constraints=custom_engine,
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


def _build_request_engine(request: Request) -> RequestEngine:
    return RequestEngine(
        id=request.id,
        worker_id=request.worker_id,
        date=request.date,
        shift_id=request.shift_id,
        penalty=getattr(penalty_map.request, "low"),
    )
