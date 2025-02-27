from collections import defaultdict
from typing import Dict, List, Set, Tuple

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionType,
    Shift,
    ShiftType,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-locals, too-many-branches, too-many-arguments
def build_worker_shift_filters(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    penalty: int,
) -> Tuple[List[Tuple[str, str, str]], int]:
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
    return list(out), penalty
