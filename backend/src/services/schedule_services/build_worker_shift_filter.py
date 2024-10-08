from collections import defaultdict
from typing import Dict, List, Set, Tuple

from core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionType,
    Shift,
    ShiftType,
    Worker,
)
from engine import WorkerShiftFilter as WorkerShiftFilterEngine


# pylint: disable=too-many-locals, too-many-branches
def build_worker_shift_filters(
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
) -> List[WorkerShiftFilterEngine]:
    worker_filters: List[WorkerShiftFilterEngine] = []

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
    worker_attrs: Dict[str, Dict[str, List[str]]] = defaultdict(dict)
    # Shift attributes: shift_id -> dimension_id -> dim_entry_ids
    shift_attrs: Dict[str, Dict[str, List[str]]] = defaultdict(dict)

    for attr in attributes:
        if attr.owner_type == AttributeOwnerType.WORKER:
            worker_attrs[attr.owner_id][attr.dimension_id] = attr.dim_entry_ids
        elif attr.owner_type == AttributeOwnerType.SHIFT:
            shift_attrs[attr.owner_id][attr.dimension_id] = attr.dim_entry_ids

    # Map to group workers by their invalid_shift_ids
    shift_filter_map: Dict[Tuple[str, ...], List[str]] = defaultdict(list)
    all_worker_ids: Set[str] = {worker.id for worker in workers}

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
        # -------- Check for shift with unmatched attributes --------

        # Collect all dimension entry IDs for workers and shifts
        worker_dim_entry_ids: Set[str] = set()
        for attrs in worker_attrs.values():
            if dimension_id in attrs:
                worker_dim_entry_ids.update(attrs[dimension_id])

        shift_dim_entry_ids: Set[str] = set()
        for attrs in shift_attrs.values():
            if dimension_id in attrs:
                shift_dim_entry_ids.update(attrs[dimension_id])

        # Identify dimension entries not present in any worker
        unmatched_dim_entries = shift_dim_entry_ids - worker_dim_entry_ids

        # Collect shifts with unmatched attributes
        shifts_with_unmatched_attrs: Set[str] = set()
        for shift_id, attrs in shift_attrs.items():
            if (
                dimension_id in attrs
                and set(attrs[dimension_id]) & unmatched_dim_entries
            ):
                shifts_with_unmatched_attrs.add(shift_id)

        # Exclude these shifts from being assigned to any worker
        if shifts_with_unmatched_attrs:
            # Convert to sorted tuple for consistent key
            invalid_shift_ids_key = tuple(sorted(shifts_with_unmatched_attrs))
            shift_filter_map[invalid_shift_ids_key] = list(all_worker_ids)

        # -------- Map worker's attributes to shift attributes --------

        # Map of attribute value to shift IDs
        attr_value_to_shift_ids: Dict[str, Set[str]] = defaultdict(set)
        for shift_id, attrs in shift_attrs.items():
            if dimension_id in attrs:
                attr_dim_entry_ids = attrs[dimension_id]
                for dim_entry_id in attr_dim_entry_ids:
                    attr_value_to_shift_ids[dim_entry_id].add(shift_id)
                # attr_value_to_shift_ids[attr_dim_entry_ids].add(shift_id)

        for worker in workers:
            if worker.id in worker_attrs and dimension_id in worker_attrs[worker.id]:
                worker_attr_dim_entry_ids = set(worker_attrs[worker.id][dimension_id])

                valid_shift_ids = set()
                for dim_entry_id in worker_attr_dim_entry_ids:
                    valid_shift_ids.update(
                        attr_value_to_shift_ids.get(dim_entry_id, set())
                    )

                # Shifts that do not have the same attribute value
                invalid_shift_ids = relevant_shift_ids - valid_shift_ids

                # Convert invalid_shift_ids to a sorted tuple to use as a
                # dictionary key
                invalid_shift_ids_key = tuple(sorted(invalid_shift_ids))

                # Add the worker ID to the list of workers with this
                # invalid_shift_ids_key
                shift_filter_map[invalid_shift_ids_key].append(worker.id)

    # Create WorkerShiftFilterEngine objects for each group
    for invalid_shift_ids_key, worker_ids in shift_filter_map.items():
        worker_filter = WorkerShiftFilterEngine(
            worker_ids=worker_ids, shift_not_to_ids=list(invalid_shift_ids_key)
        )
        worker_filters.append(worker_filter)

    # Step 4: Return the list of WorkerShiftFilter objects
    return worker_filters
