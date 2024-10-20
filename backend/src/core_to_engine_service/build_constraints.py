from datetime import date
from typing import Dict, List, Tuple

from constraint_parser.constraint_parse import parse_constraint
from core import (
    Attribute,
    ConstraintBuildAugmented,
    ConstraintOperator,
    Constraints,
    ConstraintSum,
    ConstraintType,
    Dimension,
    DimensionEntryType,
    DimEntry,
    Schedule,
    Shift,
    Worker,
)
from core_to_engine_service.types import WorkerDates


# pylint: disable=too-many-arguments
def build_constraints(
    schedule: Schedule,
    workers: List[Worker],
    dates_hist: List[date],
    dates_campaign: List[date],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    cbas: List[ConstraintBuildAugmented],
) -> Constraints:
    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        workers, dimensions, dim_entries, attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        shifts, dimensions, dim_entries, attributes
    )
    constraints = parse_constraint(
        cbas,
        schedule.id,
        workers,
        dim_to_attr_value_to_worker,
        dates_hist,
        dates_campaign,
        worker_ids_to_worker_dates,
        shifts,
        dim_to_attr_value_to_shift,
    )
    constraints.sum += build_quick_staffing_constraints(
        schedule, workers, worker_ids_to_worker_dates, shifts
    )
    return constraints


def build_quick_staffing_constraints(
    schedule: Schedule,
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
) -> List[ConstraintSum]:
    out: List[ConstraintSum] = []
    for qs in schedule.quick_staffings:
        worker = next((w for w in workers if w.id == qs.worker_id), None)
        shift = next((s for s in shifts if s.id == qs.shift_id), None)
        if worker is None or shift is None:
            continue
        constraints_vars: List[List[Tuple[str, str, str]]] = [
            [
                (worker.id, d.isoformat(), shift.id)
                for d in worker_ids_to_worker_dates[worker.id].dates_campaign
            ]
        ]
        out.append(
            ConstraintSum(
                id="",
                constraint_type=ConstraintType.SUM,
                operator=ConstraintOperator.EQUAL,
                target_value=qs.target,
                target_unit="shift",
                constraint_variables=constraints_vars,
                active=True,
                hard=False,
                priority="high",
                schedule_id=schedule.id,
                constraint_build_id="",
            )
        )
    return out


def build_dim_to_attr_value_to_owner(
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> Dict[str, Dict[str | int | float | bool, List[str]]]:
    out = {}
    owner_not_deleted_ids = [o.id for o in owners if not o.deleted]
    for dim in dimensions:
        attr_value_to_owner: Dict[str | int | float | bool, List[str]] = {}
        a_dim = [
            a
            for a in attributes
            if a.dimension_id == dim.id and a.owner_id in owner_not_deleted_ids
        ]
        if not a_dim:
            continue
        if dim.entry_type == DimensionEntryType.DIM_ENTRIES:
            for a in a_dim:
                de_names = [de.name for de in dim_entries if de.id in a.dim_entry_ids]
                for de_name in de_names:
                    if de_name not in attr_value_to_owner:
                        attr_value_to_owner[de_name] = []
                    attr_value_to_owner[de_name].append(a.owner_id)
        else:
            for a in a_dim:
                if a.value not in attr_value_to_owner:
                    attr_value_to_owner[a.value] = []
                attr_value_to_owner[a.value].append(a.owner_id)
        out[dim.id] = attr_value_to_owner
    return out
