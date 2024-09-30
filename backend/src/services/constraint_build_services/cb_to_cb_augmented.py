from typing import List, Tuple

from core import (
    Block,
    ConstraintBuild,
    ConstraintBuildAugmented,
    Dimension,
    DimensionEntryType,
    MissingProperty,
    Shift,
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
    shift_dimensions: List[Dimension],
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
        cb.blocks, workers, worker_dimensions, shifts, shift_dimensions
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
    workers: List[Worker],
    worker_dimensions: List[WorkerDimension],
    shifts: List[Shift],
    shift_dimensions: List[Dimension],
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active_worker = False
    active_shift = False
    active_shift_reference = False
    active_shift_relative = False
    for block in blocks:
        if block.name == "worker":
            (
                new_mps,
                new_active_worker,
            ) = build_missing_properties_list_and_active_worker(
                block, workers, worker_dimensions
            )
            mps += new_mps
            active_worker = active_worker or new_active_worker
        if block.name in ["shift", "shift_reference", "shift_relative"]:
            new_mps, new_active_shift = build_missing_properties_list_and_active_shift(
                block, shifts, shift_dimensions
            )
            mps += new_mps
            if block.name == "shift":
                active_shift = active_shift or new_active_shift
            if block.name == "shift_reference":
                active_shift_reference = active_shift_reference or new_active_shift
            if block.name == "shift_relative":
                active_shift_relative = active_shift_relative or new_active_shift
    active = active_worker and (
        active_shift or (active_shift_reference and active_shift_relative)
    )
    return mps, active


def build_missing_properties_list_and_active_worker(
    block: Block,
    workers: List[Worker],
    worker_dimensions: List[WorkerDimension],
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Worker block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Worker block value list does not contain ShiftWorkerOption")
    # if any(b.id_type in ["worker", ""] for b in block.value):  # type: ignore
    if (
        any(b.name == "all workers" for b in block.value)  # type: ignore
        and len([w for w in workers if not w.deleted]) > 0
    ):
        active = True
    new_mps, new_active = build_missing_properties_list_and_active_worker_deleted(
        block, workers
    )
    mps += new_mps
    active = active or new_active
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
        if wd.deleted:
            mps.append(build_missing_properties_list_deleted_wd(block, wd))
            continue
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
        elif wd.entry_type in ["str", "int"]:
            (
                new_mp,
                new_active,
            ) = build_missing_properties_list_and_active_worker_str_int_wd(block, wd)
        else:
            new_mp = None
            new_active = False
        if new_mp is not None:
            mps.append(new_mp)
        active = active or new_active
    return mps, active


def build_missing_properties_list_and_active_worker_deleted(
    block: Block,
    workers: List[Worker],
) -> Tuple[List[MissingProperty], bool]:
    mps = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Worker block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Worker block value list does not contain ShiftWorkerOption")
    worker_ids = list(
        set(b.id for b in block.value if b.id_type == "worker")  # type: ignore
    )
    if any(worker_id is None for worker_id in worker_ids):
        raise ValueError("Worker id is missing")
    for worker_id in worker_ids:
        worker = next((w for w in workers if w.id == worker_id), None)
        if worker is None:
            raise ValueError("Worker not found")
        if not worker.deleted:
            active = True
            continue
        mps.append(
            MissingProperty(
                dimension_id=worker_id,
                is_bool=False,
                dim_name=worker.name,
                category="worker",
                property_values=[worker.name],
            )
        )
    return mps, active


def build_missing_properties_list_deleted_wd(
    block: Block, wd: WorkerDimension
) -> MissingProperty:
    if wd.entry_type == "list":
        wp_values_constraint = [
            b.name for b in block.value if b.id == wd.id  # type: ignore
        ]
    elif wd.entry_type == "bool":
        wp_values_constraint = list(
            set(b.name for b in block.value if b.id == wd.id)  # type: ignore
        )
    else:
        wp_values_constraint = [
            b.name for b in block.value if b.id == wd.id  # type: ignore
        ]
    return MissingProperty(
        dimension_id=wd.id,
        is_bool=wd.entry_type == "bool",
        dim_name=wd.name,
        category="worker",
        property_values=wp_values_constraint,  # type: ignore
    )


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
    wp_all = worker_property_db.get_worker_properties_by_wd_id_for_not_deleted_w(wd.id)
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
    wp_all = worker_property_db.get_worker_properties_by_wd_id_for_not_deleted_w(wd.id)
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


def build_missing_properties_list_and_active_worker_str_int_wd(
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
    wp_all = worker_property_db.get_worker_properties_by_wd_id_for_not_deleted_w(wd.id)
    if not (
        all(isinstance(wp.value, str) for wp in wp_all)
        or all(isinstance(wp.value, int) for wp in wp_all)
    ):
        raise ValueError("Worker property value is not a str or int")
    wp_values_shifts = [wp.value for wp in wp_all]
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
    block: Block, shifts: List[Shift], shift_dimensions: List[Dimension]
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Shift block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Shift block value list does not contain ShiftWorkerOption")
    # if any(b.id_type in ["shift", ""] for b in block.value):  # type: ignore
    if (
        any(b.name == "all shifts" for b in block.value)  # type: ignore
        and len([s for s in shifts if not s.deleted]) > 0
    ):
        active = True
    new_mps, new_active = build_missing_properties_list_and_active_shift_deleted(
        block, shifts
    )
    mps += new_mps
    active = active or new_active
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
        if sd.deleted:
            mps.append(build_missing_properties_list_deleted_sd(block, sd))
            continue
        if sd.entry_type == DimensionEntryType.BOOL:
            new_mp, new_active = build_missing_properties_list_and_active_shift_bool_sd(
                block, sd
            )

        elif sd.entry_type == DimensionEntryType.DIM_ENTRIES:
            new_mp, new_active = build_missing_properties_list_and_active_shift_list_sd(
                block, sd
            )
        elif sd.entry_type in [DimensionEntryType.STR, DimensionEntryType.INT]:
            (
                new_mp,
                new_active,
            ) = build_missing_properties_list_and_active_shift_str_int_sd(block, sd)
        else:
            new_mp = None
            new_active = True
        if new_mp is not None:
            mps.append(new_mp)
        active = active or new_active
    return mps, active


def build_missing_properties_list_and_active_shift_deleted(
    block: Block,
    shifts: List[Shift],
) -> Tuple[List[MissingProperty], bool]:
    mps = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Shift block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Shift block value list does not contain ShiftWorkerOption")
    shift_ids = list(
        set(b.id for b in block.value if b.id_type == "shift")  # type: ignore
    )
    if any(shift_id is None for shift_id in shift_ids):
        raise ValueError("Shift id is missing")
    for shift_id in shift_ids:
        shift = next((s for s in shifts if s.id == shift_id), None)
        if shift is None:
            raise ValueError("Shift not found")
        if not shift.deleted:
            active = True
            continue
        mps.append(
            MissingProperty(
                dimension_id=shift_id,
                is_bool=False,
                dim_name=shift.name,
                category="shift",
                property_values=[shift.name],
            )
        )
    return mps, active


def build_missing_properties_list_deleted_sd(
    block: Block, sd: Dimension
) -> MissingProperty:
    if sd.entry_type == "list":
        sp_values_constraint = [
            b.name for b in block.value if b.id == sd.id  # type: ignore
        ]
    elif sd.entry_type == "bool":
        sp_values_constraint = list(
            set(b.name for b in block.value if b.id == sd.id)  # type: ignore
        )
    else:
        sp_values_constraint = [
            b.name for b in block.value if b.id == sd.id  # type: ignore
        ]
    return MissingProperty(
        dimension_id=sd.id,
        is_bool=sd.entry_type == "bool",
        dim_name=sd.name,
        category="shift",
        property_values=sp_values_constraint,  # type: ignore
    )


def build_missing_properties_list_and_active_shift_bool_sd(
    block: Block, sd: Dimension
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
    sp_all = shift_property_db.get_shift_properties_by_sd_id_for_not_deleted_s(sd.id)
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
    block: Block, sd: Dimension
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
    sp_all = shift_property_db.get_shift_properties_by_sd_id_for_not_deleted_s(sd.id)
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


def build_missing_properties_list_and_active_shift_str_int_sd(
    block: Block, sd: Dimension
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
    sp_all = shift_property_db.get_shift_properties_by_sd_id_for_not_deleted_s(sd.id)
    if not (
        all(isinstance(sp.value, str) for sp in sp_all)
        or all(isinstance(sp.value, int) for sp in sp_all)
    ):
        raise ValueError("Shift property value is not a str or int")
    sp_values_shifts = [sp.value for sp in sp_all]
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
