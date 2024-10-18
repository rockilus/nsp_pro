from typing import List

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
    Worker,
)
from core_to_engine_service.build_constraints import build_constraints
from core_to_engine_service.build_dates import build_dates
from core_to_engine_service.core_to_engine import core_to_engine_inputs
from engine import Inputs as InputsEngine
from services.coverage_selector_services.build_shift_demand_date import (
    build_shift_demand_dates,
)


# pylint: disable=too-many-arguments, too-many-locals, R0801
def build_engine_inputs(
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
    dates_all, dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)
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
    shift_demand_dates = build_shift_demand_dates(
        schedule, coverage_selectors, shift_demands, shifts
    )
    inputs = core_to_engine_inputs(
        workers,
        dates_all,
        dates_hist,
        dates_campaign,
        shifts,
        dimensions,
        attributes,
        shift_demand_dates,
        requests,
        constraints,
        fixed_assignments,
        wip_assignments,
    )
    return inputs
