from typing import Dict, List, Tuple

from shared.schemas import (
    Assignment,
    Attribute,
    ConstraintBuildAugmented,
    Constraints,
    DailyShiftDemand,
    Dimension,
    DimEntry,
    LinkShift,
    Request,
    Schedule,
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
)

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
    build_ws_ids_to_dates,
)
from core_to_engine_service.build_dim_to_attr_value_to_owner import (
    build_dim_to_attr_value_to_owner,
)
from core_to_engine_service.build_duty_recup_pairs import build_duty_recup_pairs
from core_to_engine_service.build_engine_constraints import build_engine_constraints
from core_to_engine_service.build_engine_fixed_values import core_to_engine_fixed_values
from core_to_engine_service.build_engine_requests import build_engine_requests
from core_to_engine_service.build_engine_shift_demands import build_engine_shift_demands
from core_to_engine_service.build_engine_sol_hint import core_to_engine_sol_hint
from core_to_engine_service.build_engine_variables import build_engine_variables
from core_to_engine_service.build_engine_work_loads import build_engine_work_loads
from core_to_engine_service.build_link_shift_pairs import build_link_shift_pairs
from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
)
from core_to_engine_service.build_worker_shift_filter import build_worker_shift_filters
from core_to_engine_service.calculate_worker_work_times import (
    calculate_worker_work_times,
)
from engine import Inputs as InputsEngine


# pylint: disable=too-many-arguments, too-many-locals, R0801
def core_to_engine_inputs(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    fixed_assignments: List[Assignment],
    cbs_augmented: List[ConstraintBuildAugmented],
    daily_shift_demands: List[DailyShiftDemand],
    requests: List[Request],
    wip_assignments: List[Assignment],
) -> Tuple[InputsEngine, Constraints]:
    # Workers
    workers_not_deleted = [w for w in workers if not w.deleted]
    worker_not_deleted_ids = [w.id for w in workers if not w.deleted]
    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        workers, dimensions, dim_entries, attributes
    )

    # Shifts
    shifts_not_deleted = [
        s
        for s in shifts
        if not s.deleted
        and (
            s.rest_type != ShiftRestType.RECUPERATION
            or any(d.id == s.recuperation_duty_id and not d.deleted for d in shifts)
        )
    ]
    shift_not_deleted_ids = [s.id for s in shifts_not_deleted]
    shifts_work = [
        s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]
    shift_duties = [s for s in shifts if s.shift_type == ShiftType.DUTY]
    shift_duties_not_deleted = [s for s in shift_duties if not s.deleted]
    shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        shifts, dimensions, dim_entries, attributes
    )

    # Dates
    dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        schedule, workers, fixed_assignments, dates_campaign
    )
    ws_to_dates = build_ws_ids_to_dates(
        schedule,
        workers,
        workers_not_deleted,
        shifts,
        shifts_not_deleted,
        fixed_assignments,
        dates_campaign,
    )

    # Work times
    w_to_work_times = calculate_worker_work_times(
        schedule,
        workers_not_deleted,
        shifts_not_deleted,
        requests,
        daily_shift_demands,
        periods_weekly,
    )
    print(w_to_work_times)

    # Constraints:
    constraints = build_engine_constraints(
        cbs_augmented,
        schedule,
        workers,
        dim_to_attr_value_to_worker,
        dates_hist,
        dates_campaign,
        periods_weekly,
        periods_monthly,
        worker_ids_to_worker_dates,
        shifts,
        dim_to_attr_value_to_shift,
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
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        ),
        shift_demands=build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
        ),
        requests=build_engine_requests(
            worker_not_deleted_ids,
            worker_ids_to_worker_dates,
            shift_not_deleted_ids,
            requests,
        ),
        constraints=constraints,
        duty_recup_pairs=build_duty_recup_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_duties_not_deleted,
        ),
        link_shifts_pairs=build_link_shift_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            link_shifts,
            daily_shift_demands,
        ),
        worker_shift_filters=build_worker_shift_filters(
            workers, worker_ids_to_worker_dates, shifts, dimensions, attributes
        ),
        fixed_values=core_to_engine_fixed_values(
            workers,
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts,
            daily_shift_demands,
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
    return inputs, constraints


def _build_shift_id_to_duration_dict(shifts: List[Shift]) -> Dict[str, int]:
    return {
        s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1) for s in shifts
    }
