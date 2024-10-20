from typing import Dict, List

from core import (
    Assignment,
    Attribute,
    ConstraintBuildAugmented,
    CoverageSelector,
    Dimension,
    DimEntry,
    Request,
    Schedule,
    Shift,
    ShiftDemand,
    ShiftType,
    Worker,
)
from core_to_engine_service.build_constraints import build_constraints
from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.build_duty_recup_pairs import build_duty_recup_pairs
from core_to_engine_service.build_engine_constraints import core_to_engine_constraints
from core_to_engine_service.build_engine_fixed_values import core_to_engine_fixed_values
from core_to_engine_service.build_engine_requests import build_engine_requests
from core_to_engine_service.build_engine_shift_demands import build_engine_shift_demands
from core_to_engine_service.build_engine_sol_hint import core_to_engine_sol_hint
from core_to_engine_service.build_engine_variables import build_engine_variables
from core_to_engine_service.build_engine_work_loads import build_engine_work_loads
from core_to_engine_service.build_worker_shift_filter import build_worker_shift_filters
from engine import Inputs as InputsEngine
from services.coverage_selector_services.build_shift_demand_date import (
    build_shift_demand_dates,
)


# pylint: disable=too-many-arguments, too-many-locals, R0801
def core_to_engine_inputs(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    fixed_assignments: List[Assignment],
    cbs_augmented: List[ConstraintBuildAugmented],
    coverage_selectors: List[CoverageSelector],
    shift_demands: List[ShiftDemand],
    requests: List[Request],
    wip_assignments: List[Assignment],
) -> InputsEngine:
    # Workers
    workers_not_deleted = [w for w in workers if not w.deleted]
    worker_not_deleted_ids = [w.id for w in workers if not w.deleted]

    # Dates
    dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)
    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        schedule, workers, fixed_assignments, dates_campaign
    )

    # Shifts
    shifts_not_deleted = [s for s in shifts if not s.deleted]
    shift_not_deleted_ids = [s.id for s in shifts if not s.deleted]
    shift_duties = [s for s in shifts if s.shift_type == ShiftType.DUTY]
    shift_duties_not_deleted = [s for s in shift_duties if not s.deleted]
    shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

    # Constraints
    constraints = build_constraints(
        schedule,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        cbs_augmented,
        dates_campaign,
    )

    # ShiftDemands
    shift_demand_dates = build_shift_demand_dates(
        schedule, coverage_selectors, shift_demands, shifts
    )

    inputs = InputsEngine(
        variables=build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        ),
        no_overlap_shift_intervals=[
            [
                (w_id, d.isoformat(), s_id)
                for d in worker_ids_to_worker_dates[w_id].dates_campaign
                for s_id in shift_not_deleted_ids
            ]
            for w_id in worker_not_deleted_ids
        ],
        work_loads=build_engine_work_loads(
            workers,
            dates_hist,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts,
            shift_duties,
            shift_id_to_duration_dict,
        ),
        shift_demands=build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_demand_dates,
        ),
        requests=build_engine_requests(
            worker_not_deleted_ids,
            worker_ids_to_worker_dates,
            shift_not_deleted_ids,
            requests,
        ),
        constraints=core_to_engine_constraints(constraints),
        duty_recup_pairs=build_duty_recup_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_duties_not_deleted,
        ),
        worker_shift_filters=build_worker_shift_filters(
            workers, worker_ids_to_worker_dates, shifts, dimensions, attributes
        ),
        fixed_values=core_to_engine_fixed_values(
            workers,
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts,
            fixed_assignments,
            requests,
        ),
        sol_hint=core_to_engine_sol_hint(
            worker_not_deleted_ids,
            worker_ids_to_worker_dates,
            shift_not_deleted_ids,
            wip_assignments,
        ),
    )
    return inputs


def _build_shift_id_to_duration_dict(shifts: List[Shift]) -> Dict[str, int]:
    return {
        s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1) for s in shifts
    }
