from typing import List, Tuple

from core import (
    Block,
    ConstraintBuild,
    ConstraintBuildAugmented,
    MissingProperty,
    Shift,
    ShiftDimension,
    ShiftWorkerOption,
    Worker,
    WorkerDimension,
)
from scripts.setup_database import shift_property_db, worker_property_db
from services.constraint_build_services.blocks_to_string import blocks_to_string


def cb_to_cb_augmented(
    cb: ConstraintBuild,
    workers: List[Worker],
    shifts: List[Shift],
    worker_dimensions: List[WorkerDimension],
    shift_dimensions: List[ShiftDimension],
) -> ConstraintBuildAugmented:
    text = blocks_to_string(
        cb.blocks,
        workers,
        shifts,
        worker_dimensions,
        shift_dimensions,
        cb.language,
    )
    missing_properties, active = build_missing_properties_list_and_active(
        cb.blocks, worker_dimensions, shift_dimensions
    )
    return ConstraintBuildAugmented(
        id=cb.id,
        team_id=cb.team_id,
        constraint_type=cb.constraint_type,
        template_id=cb.template_id,
        language=cb.language,
        blocks=cb.blocks,
        hard=cb.hard,
        priority=cb.priority,
        text=text,
        missing_properties=missing_properties,
        active=active,
    )


def build_missing_properties_list_and_active(
    blocks: List[Block],
    worker_dimensions: List[WorkerDimension],
    shift_dimensions: List[ShiftDimension],
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active_worker = False
    active_shift = False
    for block in blocks:
        if block.name == "worker":
            (
                new_mps,
                new_active_worker,
            ) = build_missing_properties_list_and_active_worker(
                block, worker_dimensions
            )
            mps += new_mps
            active_worker = active_worker or new_active_worker
        if block.name in ["shift", "shift_reference", "shift_relative"]:
            new_mps, new_active_shift = build_missing_properties_list_and_active_shift(
                block, shift_dimensions
            )
            mps += new_mps
            active_shift = active_shift or new_active_shift
    active = active_worker and active_shift
    return mps, active


def build_missing_properties_list_and_active_worker(
    block: Block, worker_dimensions: List[WorkerDimension]
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Worker block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Worker block value list does not contain ShiftWorkerOption")
    if any(b.id_type in ["worker", ""] for b in block.value):  # type: ignore
        active = True
    wd_ids = list(
        set(
            b.id  # type: ignore
            for b in block.value
            if b.id_type == "worker_dimension"  # type: ignore
        )
    )
    if any(wd_id is None for wd_id in wd_ids):
        raise ValueError("Worker dimension id is missing")
    for wd_id in wd_ids:
        wd = next((wd for wd in worker_dimensions if wd.id == wd_id), None)
        if wd is None:
            raise ValueError("Worker dimension not found")
        if wd.entry_type == "bool":
            (
                new_mp,
                new_active,
            ) = build_missing_properties_list_and_active_worker_bool_wd(block, wd)

        elif wd.entry_type == "list":
            (
                new_mp,
                new_active,
            ) = build_missing_properties_list_and_active_worker_list_wd(block, wd)
        else:
            new_mp = None
            new_active = True
        if new_mp is not None:
            mps.append(new_mp)
        active = active or new_active
    return mps, active


def build_missing_properties_list_and_active_worker_bool_wd(
    block: Block, wd: WorkerDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Worker block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Worker block value list does not contain ShiftWorkerOption")
    wp_values_constraint: List[bool] = list(
        set(b.name for b in block.value if b.id == wd.id)  # type: ignore
    )
    if any(value is None for value in wp_values_constraint):
        raise ValueError("Worker property value from block is missing")
    wp_all = worker_property_db.get_worker_properties_by_worker_dimension_id(wd.id)
    wp_values_shifts = [wp.value for wp in wp_all]
    if not all(isinstance(v, bool) for v in wp_values_shifts):
        raise ValueError("Worker property value is not a boolean")
    missing_values = list(
        set(wp_values_constraint) - set(wp_values_shifts)  # type: ignore
    )
    not_missing_values = list(set(wp_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingProperty(
            dimension_id=wd.id,
            is_bool=True,
            dim_name=wd.name,
            category="worker",
            property_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_worker_list_wd(
    block: Block, wd: WorkerDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Worker block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Worker block value list does not contain ShiftWorkerOption")
    wp_values_constraint = [
        b.name for b in block.value if b.id == wd.id  # type: ignore
    ]
    if any(value is None for value in wp_values_constraint):
        raise ValueError("Worker property value from block is missing")
    wp_all = worker_property_db.get_worker_properties_by_worker_dimension_id(wd.id)
    if not all(isinstance(wp.value, list) for wp in wp_all):
        raise ValueError("Worker property value is not a list")
    wp_values_shifts = [item for wp in wp_all for item in wp.value]  # type: ignore
    missing_values = list(set(wp_values_constraint) - set(wp_values_shifts))
    not_missing_values = list(set(wp_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingProperty(
            dimension_id=wd.id,
            is_bool=False,
            dim_name=wd.name,
            category="worker",
            property_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_shift(
    block: Block, shift_dimensions: List[ShiftDimension]
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Shift block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Shift block value list does not contain ShiftWorkerOption")
    if any(b.id_type in ["shift", ""] for b in block.value):  # type: ignore
        active = True
    sd_ids = list(
        set(
            b.id  # type: ignore
            for b in block.value
            if b.id_type == "shift_dimension"  # type: ignore
        )
    )
    if any(sd_id is None for sd_id in sd_ids):
        raise ValueError("Shift dimension id is missing")
    for sd_id in sd_ids:
        sd = next((sd for sd in shift_dimensions if sd.id == sd_id), None)
        if sd is None:
            raise ValueError("Shift dimension not found")
        if sd.entry_type == "bool":
            new_mp, new_active = build_missing_properties_list_and_active_shift_bool_sd(
                block, sd
            )

        elif sd.entry_type == "list":
            new_mp, new_active = build_missing_properties_list_and_active_shift_list_sd(
                block, sd
            )
        else:
            new_mp = None
            new_active = True
        if new_mp is not None:
            mps.append(new_mp)
        active = active or new_active
    return mps, active


def build_missing_properties_list_and_active_shift_bool_sd(
    block: Block, sd: ShiftDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Shift block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Shift block value list does not contain ShiftWorkerOption")
    sp_values_constraint: List[bool] = list(
        set(b.name for b in block.value if b.id == sd.id)  # type: ignore
    )
    if any(value is None for value in sp_values_constraint):
        raise ValueError("Shift property value from block is missing")
    sp_all = shift_property_db.get_shift_properties_by_shift_dimension_id(sd.id)
    sp_values_shifts = [sp.value for sp in sp_all]
    if not all(isinstance(v, bool) for v in sp_values_shifts):
        raise ValueError("Shift property value is not a boolean")
    missing_values = list(
        set(sp_values_constraint) - set(sp_values_shifts)  # type: ignore
    )
    not_missing_values = list(set(sp_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingProperty(
            dimension_id=sd.id,
            is_bool=True,
            dim_name=sd.name,
            category="shift",
            property_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_shift_list_sd(
    block: Block, sd: ShiftDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Shift block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Shift block value list does not contain ShiftWorkerOption")
    sp_values_constraint = [
        b.name for b in block.value if b.id == sd.id  # type: ignore
    ]
    if any(value is None for value in sp_values_constraint):
        raise ValueError("Shift property value from block is missing")
    sp_all = shift_property_db.get_shift_properties_by_shift_dimension_id(sd.id)
    if not all(isinstance(sp.value, list) for sp in sp_all):
        raise ValueError("Shift property value is not a list")
    sp_values_shifts = [item for sp in sp_all for item in sp.value]  # type: ignore
    missing_values = list(set(sp_values_constraint) - set(sp_values_shifts))
    not_missing_values = list(set(sp_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingProperty(
            dimension_id=sd.id,
            is_bool=False,
            dim_name=sd.name,
            category="shift",
            property_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0
