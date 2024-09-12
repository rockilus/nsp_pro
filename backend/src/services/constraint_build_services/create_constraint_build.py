from typing import List, Tuple

from core import Block, ConstraintBuild, MissingProperty
from scripts.setup_database import (
    constraint_build_db,
    schedule_db,
    shift_dimension_db,
    shift_property_db,
    worker_property_db,
)
from services.constraint_build_services.blocks_to_string import (
    blocks_to_string,
)


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
    active = False
    for block in blocks:
        if block.name == "worker":
            wd_ids = [
                b["id"]
                for b in block.value
                if b["id_type"] == "worker_dimension"
            ]
            for wd_id in wd_ids:
                wp_used = [b["name"] for b in block.value if b["id"] == wd_id]
                wp_all = worker_property_db.get_worker_properties_by_worker_dimension_id(
                    wd_id
                )
                wp_all_values = [wp.value for wp in wp_all]
                missing_values = list(set(wp_used) - set(wp_all_values))
                if missing_values:
                    mp = MissingProperty(
                        dimension_id=wd_id, property_values=missing_values
                    )
                    mps.append(mp)
        if block.name in ["shift", "shift_reference", "shift_relative"]:
            sd_ids = list(
                set(
                    b["id"]
                    for b in block.value
                    if b["id_type"] == "shift_dimension"
                )
            )
            for sd_id in sd_ids:
                sd = shift_dimension_db.get_shift_dimension_by_id(sd_id)
                if sd.entry_type not in ["bool", "list"]:
                    active = True
                    continue
                if sd.entry_type == "list":
                    sp_values_constraint = [
                        b["name"] for b in block.value if b["id"] == sd_id
                    ]
                else:
                    sp_values_constraint_string = list(
                        set(b["name"] for b in block.value if b["id"] == sd_id)
                    )
                    sp_values_constraint = []
                    for value in sp_values_constraint_string:
                        if (
                            value.lower()[:4] == "not "
                            and value.lower()[4:] == sd.name.lower()
                        ):
                            sp_values_constraint.append(False)
                        elif value.lower() == sd.name.lower():
                            sp_values_constraint.append(True)
                sp_all = shift_property_db.get_shift_properties_by_shift_dimension_id(
                    sd_id
                )
                if sd.entry_type == "list":
                    sp_values_shifts = [
                        item for sp in sp_all for item in sp.value
                    ]
                else:
                    sp_values_shifts = [sp.value for sp in sp_all]
                missing_values = list(
                    set(sp_values_constraint) - set(sp_values_shifts)
                )
                not_missing_values = list(
                    set(sp_values_constraint) - set(missing_values)
                )
                if missing_values:
                    if sd.entry_type == "list":
                        mp = MissingProperty(
                            dimension_id=sd_id, property_values=missing_values
                        )
                    elif sd.entry_type == "bool":
                        missing_values_string = [
                            sd.name if v else f"not {sd.name}"
                            for v in missing_values
                        ]
                        mp = MissingProperty(
                            dimension_id=sd_id,
                            property_values=missing_values_string,
                        )
                    mps.append(mp)
                if not_missing_values:
                    active = True
    return mps, active
