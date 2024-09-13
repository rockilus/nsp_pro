from typing import List, Tuple

from core import (
    Block,
    ConstraintBuild,
    MissingProperty,
    ShiftDimension,
    WorkerDimension,
)
from scripts.setup_database import (
    constraint_build_db,
    schedule_db,
    shift_dimension_db,
    shift_property_db,
    worker_dimension_db,
    worker_property_db,
)
from services.constraint_build_services.blocks_to_string import blocks_to_string


def create_constraint_build(
    cb_data: ConstraintBuild,
) -> ConstraintBuild:
    cb_data.text = blocks_to_string(cb_data.blocks, cb_data.language)
    missing_properties, active = build_missing_properties_list_and_active(
        cb_data.blocks
    )
    cb_data.missing_properties = missing_properties
    cb_data.active = active
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    schedule_wip = schedule_db.get_schedule_wip(cb_data.team_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.append(constraint_build.id)
        schedule_db.update_schedule(schedule_wip)
    return constraint_build


def build_missing_properties_list_and_active(
    blocks: List[Block],
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active_worker = False
    active_shift = False
    for block in blocks:
        if block.name == "worker":
            (
                new_mps,
                new_active_worker,
            ) = build_missing_properties_list_and_active_worker(block)
            mps += new_mps
            active_worker = active_worker or new_active_worker
        if block.name in ["shift", "shift_reference", "shift_relative"]:
            new_mps, new_active_shift = build_missing_properties_list_and_active_shift(
                block
            )
            mps += new_mps
            active_shift = active_shift or new_active_shift
    active = active_worker and active_shift
    return mps, active


def build_missing_properties_list_and_active_worker(
    block: Block,
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Worker block value is not a list of dictionaries")
    if any(b.get("id_type") in ["worker", ""] for b in block.value):  # type: ignore
        active = True
    wd_ids = list(
        set(
            b.get("id")  # type: ignore
            for b in block.value
            if b.get("id_type") == "worker_dimension"  # type: ignore
        )
    )
    if any(wd_id is None for wd_id in wd_ids):
        raise ValueError("Worker dimension id is missing")
    for wd_id in wd_ids:
        wd = worker_dimension_db.get_worker_dimension_by_id(wd_id)  # type: ignore
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
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Worker block value is not a list of dictionaries")
    wp_values_constraint_string = list(
        set(b.get("name") for b in block.value if b.get("id") == wd.id)  # type: ignore
    )
    if any(value is None for value in wp_values_constraint_string):
        raise ValueError("Worker property value from block is missing")
    wp_values_constraint: List[bool] = []
    for value in wp_values_constraint_string:
        if (
            value.lower()[:4] == "not "  # type: ignore
            and value.lower()[4:] == wd.name.lower()  # type: ignore
        ):
            wp_values_constraint.append(False)
        elif value.lower() == wd.name.lower():  # type: ignore
            wp_values_constraint.append(True)
    wp_all = worker_property_db.get_worker_properties_by_worker_dimension_id(wd.id)
    wp_values_shifts = [wp.value for wp in wp_all]
    if not all(isinstance(v, bool) for v in wp_values_shifts):
        raise ValueError("Worker property value is not a boolean")
    missing_values = list(
        set(wp_values_constraint) - set(wp_values_shifts)  # type: ignore
    )
    not_missing_values = list(set(wp_values_constraint) - set(missing_values))
    if missing_values:
        missing_values_string = [
            wd.name if v else f"not {wd.name}" for v in missing_values
        ]
        mp = MissingProperty(
            dimension_id=wd.id,
            property_values=missing_values_string,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_worker_list_wd(
    block: Block, wd: WorkerDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Worker block value is not a list of dictionaries")
    wp_values_constraint = [
        b.get("name") for b in block.value if b.get("id") == wd.id  # type: ignore
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
            dimension_id=wd.id, property_values=missing_values  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_shift(
    block: Block,
) -> Tuple[List[MissingProperty], bool]:
    mps: List[MissingProperty] = []
    active = False
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Shift block value is not a list of dictionaries")
    if any(b.get("id_type") in ["shift", ""] for b in block.value):  # type: ignore
        active = True
    sd_ids = list(
        set(
            b.get("id")  # type: ignore
            for b in block.value
            if b.get("id_type") == "shift_dimension"  # type: ignore
        )
    )
    if any(sd_id is None for sd_id in sd_ids):
        raise ValueError("Shift dimension id is missing")
    for sd_id in sd_ids:
        sd = shift_dimension_db.get_shift_dimension_by_id(sd_id)  # type: ignore
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
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Shift block value is not a list of dictionaries")
    sp_values_constraint_string = list(
        set(b.get("name") for b in block.value if b.get("id") == sd.id)  # type: ignore
    )
    if any(value is None for value in sp_values_constraint_string):
        raise ValueError("Shift property value from block is missing")
    sp_values_constraint: List[bool] = []
    for value in sp_values_constraint_string:
        if (
            value.lower()[:4] == "not "  # type: ignore
            and value.lower()[4:] == sd.name.lower()  # type: ignore
        ):
            sp_values_constraint.append(False)
        elif value.lower() == sd.name.lower():  # type: ignore
            sp_values_constraint.append(True)
    sp_all = shift_property_db.get_shift_properties_by_shift_dimension_id(sd.id)
    sp_values_shifts = [sp.value for sp in sp_all]
    if not all(isinstance(v, bool) for v in sp_values_shifts):
        raise ValueError("Shift property value is not a boolean")
    missing_values = list(
        set(sp_values_constraint) - set(sp_values_shifts)  # type: ignore
    )
    not_missing_values = list(set(sp_values_constraint) - set(missing_values))
    if missing_values:
        missing_values_string = [
            sd.name if v else f"not {sd.name}" for v in missing_values
        ]
        mp = MissingProperty(
            dimension_id=sd.id,
            property_values=missing_values_string,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_properties_list_and_active_shift_list_sd(
    block: Block, sd: ShiftDimension
) -> Tuple[MissingProperty | None, bool]:
    if not isinstance(block.value, list) or not all(
        isinstance(b, dict) for b in block.value
    ):
        raise ValueError("Shift block value is not a list of dictionaries")
    sp_values_constraint = [
        b.get("name") for b in block.value if b.get("id") == sd.id  # type: ignore
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
            dimension_id=sd.id, property_values=missing_values  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0
