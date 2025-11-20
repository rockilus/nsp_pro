from collections import defaultdict
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    Shift,
    ShiftType,
    Worker,
    WorkerDates,
)

# pylint: disable=too-many-locals, too-many-branches, too-many-arguments


class BoolSharedPolicy(Enum):
    """Policy for how boolean shared dimensions should restrict assignments.

    - MATCH_BOTH: both directions must match (shift True <-> worker True,
    shift False <-> worker False).
    - SHIFT_TRUE_ONLY: only shifts with True restrict workers to those with True.
    - WORKER_TRUE_ONLY: only workers with True are restricted to shifts with True.
    - NONE: no boolean-based restriction.
    """

    MATCH_BOTH = "match_both"
    SHIFT_TRUE_ONLY = "shift_true_only"
    WORKER_TRUE_ONLY = "worker_true_only"
    NONE = "none"


def build_worker_shift_filters_dim_entry(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
) -> List[Tuple[str, str, str]]:
    out: Set[Tuple[str, str, str]] = set()

    # Step 1: Identify shared dimensions
    shared_dimensions = [
        dim
        for dim in dimensions
        if not dim.deleted
        and (
            DimensionType.WORKER in dim.dim_types
            and DimensionType.SHIFT in dim.dim_types
        )
        or (
            DimensionType.WORKER in dim.dim_types
            and DimensionType.REST_SHIFT in dim.dim_types
        )
    ]

    # Step 2: Build attribute mappings
    # Worker attributes: worker_id -> dimension_id -> dim_entry_ids
    worker_attrs: Dict[str, Dict[str, Set[str]]] = defaultdict(lambda: defaultdict(set))
    # Shift attributes: shift_id -> dimension_id -> dim_entry_ids
    shift_attrs: Dict[str, Dict[str, Set[str]]] = defaultdict(lambda: defaultdict(set))

    for attr in attributes:
        if attr.owner_type == AttributeOwnerType.WORKER:
            for de_id in attr.dim_entry_ids:
                worker_attrs[attr.owner_id][attr.dimension_id].add(de_id)
        elif attr.owner_type == AttributeOwnerType.SHIFT:
            for de_id in attr.dim_entry_ids:
                shift_attrs[attr.owner_id][attr.dimension_id].add(de_id)

    # Map to group workers by their invalid_shift_ids
    all_worker_ids: Set[str] = {worker.id for worker in workers if not worker.deleted}

    # Step 3: Build worker shift filters
    for dimension in shared_dimensions:
        dimension_id = dimension.id

        # Determine the shift types to include based on dimension.dim_types
        shift_types_to_include = set()

        if DimensionType.SHIFT in dimension.dim_types:
            shift_types_to_include.update({ShiftType.NORMAL, ShiftType.DUTY})

        if DimensionType.REST_SHIFT in dimension.dim_types:
            shift_types_to_include.add(ShiftType.REST)

        # Build relevant_shift_ids accordingly
        relevant_shift_ids: Set[str] = {
            shift.id
            for shift in shifts
            if not shift.deleted and shift.shift_type in shift_types_to_include
        }

        # -------- Filter out shifts that don't have worker attribute --------

        # Map of attribute value to shift IDs
        attr_value_to_shift_ids: Dict[str, Set[str]] = defaultdict(set)
        for shift_id, attrs in shift_attrs.items():
            if dimension_id in attrs:
                attr_dim_entry_ids = attrs[dimension_id]
                for de_id in attr_dim_entry_ids:
                    attr_value_to_shift_ids[de_id].add(shift_id)

        for worker in workers:
            if worker.id in worker_attrs and dimension_id in worker_attrs[worker.id]:
                worker_attr_dim_entry_ids = worker_attrs.get(worker.id, {}).get(
                    dimension_id, set()
                )

                valid_shift_ids = set()
                for de_id in worker_attr_dim_entry_ids:
                    valid_shift_ids.update(attr_value_to_shift_ids.get(de_id, set()))

                # Shifts that do not have the same attribute value
                invalid_shift_ids = relevant_shift_ids - valid_shift_ids

                # Add invalid tuples for the worker
                for shift_id in invalid_shift_ids:
                    out.update(
                        [
                            (worker.id, d.isoformat(), shift_id)
                            for d in worker_ids_to_worker_dates[
                                worker.id
                            ].dates_campaign
                        ]
                    )

        # -------- Filter out workers that don't have shift attribute --------

        # Map of attribute value to worker IDs
        attr_value_to_worker_ids: Dict[str, Set[str]] = defaultdict(set)
        for worker_id, attrs in worker_attrs.items():
            if dimension_id in attrs:
                attr_dim_entry_ids = attrs[dimension_id]
                for de_id in attr_dim_entry_ids:
                    attr_value_to_worker_ids[de_id].add(worker_id)

        for shift in [s for s in shifts if not s.deleted]:  # [TO REVIEW]
            if shift.id in shift_attrs and dimension_id in shift_attrs[shift.id]:
                shift_attr_dim_entry_ids = shift_attrs.get(shift.id, {}).get(
                    dimension_id, set()
                )

                valid_worker_ids = set()
                for de_id in shift_attr_dim_entry_ids:
                    valid_worker_ids.update(attr_value_to_worker_ids.get(de_id, set()))

                # Shifts that do not have the same attribute value
                invalid_worker_ids = all_worker_ids - valid_worker_ids

                # Add invalid tuples for the worker
                for worker_id in invalid_worker_ids:
                    out.update(
                        [
                            (worker_id, d.isoformat(), shift.id)
                            for d in worker_ids_to_worker_dates[
                                worker_id
                            ].dates_campaign
                        ]
                    )

    # Return the list of unique (worker_id, invalid_shift_id) and
    # (invalid_worker_id, shift_id) tuples
    return list(out)


def build_worker_shift_filters_worker_true(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    allowed_dimension_ids: Optional[Set[str]] = None,
) -> List[Tuple[str, str, str]]:
    """Build worker->shift True-only filters (worker True -> shift True).

    For workers that have the boolean True for a shared dimension, forbid any
    assignment to shifts that do not also have True for that dimension.
    """
    out: Set[Tuple[str, str, str]] = set()
    # reference 'workers' to avoid unused-argument linter warnings
    _ = workers

    # consider only shared boolean dimensions
    shared_dimensions = [
        dim
        for dim in dimensions
        if not dim.deleted
        and dim.entry_type == DimensionEntryType.BOOL
        and (
            (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.SHIFT in dim.dim_types
            )
            or (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.REST_SHIFT in dim.dim_types
            )
        )
    ]

    # worker boolean attrs: worker_id -> dimension_id -> bool
    worker_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)
    # shift boolean attrs: shift_id -> dimension_id -> bool
    shift_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)

    for attr in attributes:
        if not isinstance(attr.value, bool):
            continue
        if attr.owner_type == AttributeOwnerType.WORKER:
            worker_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)
        elif attr.owner_type == AttributeOwnerType.SHIFT:
            shift_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)

    for dimension in shared_dimensions:
        if (
            allowed_dimension_ids is not None
            and dimension.id not in allowed_dimension_ids
        ):
            continue
        dimension_id = dimension.id

        # determine shift types to include
        shift_types_to_include = set()
        if DimensionType.SHIFT in dimension.dim_types:
            shift_types_to_include.update({ShiftType.NORMAL, ShiftType.DUTY})
        if DimensionType.REST_SHIFT in dimension.dim_types:
            shift_types_to_include.add(ShiftType.REST)

        relevant_shifts = [
            s
            for s in shifts
            if not s.deleted and s.shift_type in shift_types_to_include
        ]

        # shifts that explicitly have True for this dimension
        shifts_with_true: Set[str] = set()
        for s in relevant_shifts:
            attrs = shift_bool_attrs.get(s.id, {})
            if dimension_id in attrs and attrs[dimension_id] is True:
                shifts_with_true.add(s.id)

        if not shifts_with_true:
            continue

        # workers that have True for this dimension
        workers_with_true: Set[str] = set()
        for worker_id, bool_attrs in worker_bool_attrs.items():
            if dimension_id in bool_attrs and bool_attrs[dimension_id] is True:
                workers_with_true.add(worker_id)

        # For each worker with True, forbid non-True shifts
        for worker_id in workers_with_true:
            if worker_id not in worker_ids_to_worker_dates:
                continue
            invalid_shift_ids = {s.id for s in relevant_shifts} - shifts_with_true
            dates = worker_ids_to_worker_dates[worker_id].dates_campaign
            for shift_id in invalid_shift_ids:
                for d in dates:
                    out.add((worker_id, d.isoformat(), shift_id))

    return list(out)


def build_worker_shift_filters_bool(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    allowed_dimension_ids: Optional[Set[str]] = None,
) -> List[Tuple[str, str, str]]:
    """Build worker-shift filters for boolean-type shared dimensions only.

    Returns list of (worker_id, date_iso, shift_id) tuples and penalty.
    """
    out: Set[Tuple[str, str, str]] = set()

    # consider only shared boolean dimensions
    shared_dimensions = [
        dim
        for dim in dimensions
        if not dim.deleted
        and dim.entry_type == DimensionEntryType.BOOL
        and (
            (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.SHIFT in dim.dim_types
            )
            or (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.REST_SHIFT in dim.dim_types
            )
        )
    ]

    # worker boolean attrs: worker_id -> dimension_id -> bool
    worker_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)
    # shift boolean attrs: shift_id -> dimension_id -> bool
    shift_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)

    for attr in attributes:
        # only consider attrs with boolean values
        if not isinstance(attr.value, bool):
            continue
        if attr.owner_type == AttributeOwnerType.WORKER:
            worker_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)
        elif attr.owner_type == AttributeOwnerType.SHIFT:
            shift_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)

    all_worker_ids: Set[str] = {w.id for w in workers if not w.deleted}

    for dimension in shared_dimensions:
        if (
            allowed_dimension_ids is not None
            and dimension.id not in allowed_dimension_ids
        ):
            continue
        dimension_id = dimension.id

        # determine shift types to include
        shift_types_to_include = set()
        if DimensionType.SHIFT in dimension.dim_types:
            shift_types_to_include.update({ShiftType.NORMAL, ShiftType.DUTY})
        if DimensionType.REST_SHIFT in dimension.dim_types:
            shift_types_to_include.add(ShiftType.REST)

        relevant_shift_ids: Set[str] = {
            s.id
            for s in shifts
            if not s.deleted and s.shift_type in shift_types_to_include
        }

        # map bool value -> shift ids
        attr_bool_value_to_shift_ids: Dict[bool, Set[str]] = defaultdict(set)
        for shift_id, bool_attrs in shift_bool_attrs.items():
            if dimension_id in bool_attrs:
                attr_bool_value_to_shift_ids[bool_attrs[dimension_id]].add(shift_id)

        # filter shifts that don't match worker boolean attr
        for worker in workers:
            if (
                worker.id in worker_bool_attrs
                and dimension_id in worker_bool_attrs[worker.id]
            ):
                worker_bool_value = worker_bool_attrs[worker.id][dimension_id]
                valid_shift_ids = attr_bool_value_to_shift_ids.get(
                    worker_bool_value, set()
                )

                invalid_shift_ids = relevant_shift_ids - valid_shift_ids

                for shift_id in invalid_shift_ids:
                    out.update(
                        [
                            (worker.id, d.isoformat(), shift_id)
                            for d in worker_ids_to_worker_dates[
                                worker.id
                            ].dates_campaign
                        ]
                    )

        # map bool value -> worker ids
        attr_bool_value_to_worker_ids: Dict[bool, Set[str]] = defaultdict(set)
        for worker_id, bool_attrs in worker_bool_attrs.items():
            if dimension_id in bool_attrs:
                attr_bool_value_to_worker_ids[bool_attrs[dimension_id]].add(worker_id)

        # filter workers that don't match shift boolean attr
        for shift in [s for s in shifts if not s.deleted]:
            if (
                shift.id in shift_bool_attrs
                and dimension_id in shift_bool_attrs[shift.id]
            ):
                shift_bool_value = shift_bool_attrs[shift.id][dimension_id]
                valid_worker_ids = attr_bool_value_to_worker_ids.get(
                    shift_bool_value, set()
                )

                invalid_worker_ids = all_worker_ids - valid_worker_ids

                for worker_id in invalid_worker_ids:
                    out.update(
                        [
                            (worker_id, d.isoformat(), shift.id)
                            for d in worker_ids_to_worker_dates[
                                worker_id
                            ].dates_campaign
                        ]
                    )

    return list(out)


def build_worker_shift_filters_bool_shift_true(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    allowed_dimension_ids: Optional[Set[str]] = None,
) -> List[Tuple[str, str, str]]:
    """Build worker-shift filters enforcing only shifts with True attr.

    Logic (per-dimension, boolean shared dims):
    - If a shift has attribute True for the shared dimension, only workers
      with attribute True for that dimension may do that shift.
    - If a shift has attribute False (or no explicit attr), no worker
      filtering is applied for that shift.

    In short:
    - shift True -> worker True (restrict)
    - shift False or missing -> any worker (no restriction)
    - worker True/False do not by themselves restrict shifts

    Returns list of (worker_id, date_iso, shift_id) invalid tuples.
    """
    out: Set[Tuple[str, str, str]] = set()

    # consider only shared boolean dimensions
    shared_dimensions = [
        dim
        for dim in dimensions
        if not dim.deleted
        and dim.entry_type == DimensionEntryType.BOOL
        and (
            (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.SHIFT in dim.dim_types
            )
            or (
                DimensionType.WORKER in dim.dim_types
                and DimensionType.REST_SHIFT in dim.dim_types
            )
        )
    ]

    # worker boolean attrs: worker_id -> dimension_id -> bool
    worker_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)
    # shift boolean attrs: shift_id -> dimension_id -> bool
    shift_bool_attrs: Dict[str, Dict[str, bool]] = defaultdict(dict)

    for attr in attributes:
        # only consider attrs with boolean values
        if not isinstance(attr.value, bool):
            continue
        if attr.owner_type == AttributeOwnerType.WORKER:
            worker_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)
        elif attr.owner_type == AttributeOwnerType.SHIFT:
            shift_bool_attrs[attr.owner_id][attr.dimension_id] = bool(attr.value)

    all_worker_ids: Set[str] = {w.id for w in workers if not w.deleted}

    for dimension in shared_dimensions:
        if (
            allowed_dimension_ids is not None
            and dimension.id not in allowed_dimension_ids
        ):
            continue
        dimension_id = dimension.id

        # determine shift types to include
        shift_types_to_include = set()
        if DimensionType.SHIFT in dimension.dim_types:
            shift_types_to_include.update({ShiftType.NORMAL, ShiftType.DUTY})
        if DimensionType.REST_SHIFT in dimension.dim_types:
            shift_types_to_include.add(ShiftType.REST)

        # relevant shifts for this dimension
        relevant_shifts = [
            s
            for s in shifts
            if not s.deleted and s.shift_type in shift_types_to_include
        ]

        # Only enforce for shifts that explicitly have the boolean attr True
        restricted_shift_ids: Set[str] = set()
        for s in relevant_shifts:
            attrs = shift_bool_attrs.get(s.id, {})
            if dimension_id in attrs and attrs[dimension_id] is True:
                restricted_shift_ids.add(s.id)

        if not restricted_shift_ids:
            continue

        # gather workers that have True for this dimension
        workers_with_true: Set[str] = set()
        for worker_id, bool_attrs in worker_bool_attrs.items():
            if dimension_id in bool_attrs and bool_attrs[dimension_id] is True:
                workers_with_true.add(worker_id)

        # For each restricted shift, workers without True are invalid
        for shift_id in restricted_shift_ids:
            invalid_worker_ids = all_worker_ids - workers_with_true
            for worker_id in invalid_worker_ids:
                # Skip if no dates for worker
                if worker_id not in worker_ids_to_worker_dates:
                    continue
                dates = worker_ids_to_worker_dates[worker_id].dates_campaign
                out.update([(worker_id, d.isoformat(), shift_id) for d in dates])

    return list(out)


def build_worker_shift_filters_no_duties(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
) -> List[Tuple[str, str, str]]:
    """Forbid assigning workers with zero duties_per_month to DUTY shifts.

    Returns list of (worker_id, date_iso, shift_id) invalid tuples.
    """
    out: Set[Tuple[str, str, str]] = set()

    for worker in workers:
        if worker.deleted:
            continue
        if worker.duties_per_month != 0:
            continue
        if worker.id not in worker_ids_to_worker_dates:
            continue
        dates = worker_ids_to_worker_dates[worker.id].dates_campaign

        for shift in shifts:
            if shift.deleted:
                continue
            if shift.shift_type == ShiftType.DUTY:
                for d in dates:
                    out.add((worker.id, d.isoformat(), shift.id))

    return list(out)


def build_worker_shift_filters(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    fixed_values: Dict[Tuple[str, str, str], int],
    penalty: int,
    shared_bool_policies: Optional[Dict[str, BoolSharedPolicy]] = None,
) -> Tuple[List[Tuple[str, str, str]], int]:
    """Combine filters from dim-entry and bool shared dimensions.

    This function delegates to build_worker_shift_filters_dim_entry and
    build_worker_shift_filters_bool, merges their results (deduplicated)
    and returns the combined list of (worker_id, date_iso, shift_id)
    tuples along with a penalty. The returned penalty is the max of the
    two returned penalties (they usually receive the same `penalty`).
    """
    dim_out = build_worker_shift_filters_dim_entry(
        workers, worker_ids_to_worker_dates, shifts, dimensions, attributes
    )

    # boolean shared-dimension filtering: allow per-dimension policies
    if shared_bool_policies is None:
        bool_out = build_worker_shift_filters_bool(
            workers, worker_ids_to_worker_dates, shifts, dimensions, attributes
        )
        combined_set = set(dim_out) | set(bool_out)
    else:
        match_ids: Set[str] = set()
        shift_true_ids: Set[str] = set()
        worker_true_ids: Set[str] = set()
        for dim_id, policy in shared_bool_policies.items():
            if policy == BoolSharedPolicy.MATCH_BOTH:
                match_ids.add(dim_id)
            elif policy == BoolSharedPolicy.SHIFT_TRUE_ONLY:
                shift_true_ids.add(dim_id)
            elif policy == BoolSharedPolicy.WORKER_TRUE_ONLY:
                worker_true_ids.add(dim_id)

        bool_out_set: Set[Tuple[str, str, str]] = set()
        if match_ids:
            bool_out_set |= set(
                build_worker_shift_filters_bool(
                    workers,
                    worker_ids_to_worker_dates,
                    shifts,
                    dimensions,
                    attributes,
                    allowed_dimension_ids=match_ids,
                )
            )
        if shift_true_ids:
            bool_out_set |= set(
                build_worker_shift_filters_bool_shift_true(
                    workers,
                    worker_ids_to_worker_dates,
                    shifts,
                    dimensions,
                    attributes,
                    allowed_dimension_ids=shift_true_ids,
                )
            )
        if worker_true_ids:
            bool_out_set |= set(
                build_worker_shift_filters_worker_true(
                    workers,
                    worker_ids_to_worker_dates,
                    shifts,
                    dimensions,
                    attributes,
                    allowed_dimension_ids=worker_true_ids,
                )
            )

        combined_set = set(dim_out) | bool_out_set

    # Forbid duty shifts for workers with zero duties_per_month
    no_duty_out = build_worker_shift_filters_no_duties(
        workers, worker_ids_to_worker_dates, shifts
    )
    combined_set |= set(no_duty_out)

    for assignment, value in fixed_values.items():
        if value == 1 and assignment in combined_set:
            combined_set.remove(assignment)

    return list(combined_set), penalty
