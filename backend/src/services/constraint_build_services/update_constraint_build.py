# pylint: disable=R0801
from core import MissingProperty
from scripts.setup_database import constraint_build_db


def update_cbs_change_shift_property(
    shift_dimension_id: str,
    old_value: str | int | float | bool,
) -> None:
    # Get constraint builds that have old value, add the old value to missing
    # properties, a deactivate them if needed
    update_cbs_change_shift_property_remove_old_value(shift_dimension_id, old_value)

    # Get the constraint builds that have new value, remove the new value from
    # missing properties, and activate them if needed


def update_cbs_change_shift_property_remove_old_value(
    shift_dimension_id: str, value: str | int | float | bool
) -> None:
    # Get constraint builds with old value
    cbs = constraint_build_db.get_constraint_builds_by_sd_id_and_sp_value(
        shift_dimension_id, value
    )
    for cb in cbs:
        # Add old value to missing properties
        if any(mp.dimension_id == shift_dimension_id for mp in cb.missing_properties):
            for mp in cb.missing_properties:
                if mp.dimension_id == shift_dimension_id:
                    mp.property_values.append(value)  # type: ignore
        else:
            cb.missing_properties.append(
                MissingProperty(
                    dimension_id=shift_dimension_id,
                    property_values=[value],  # type: ignore
                )
            )
        for block in cb.blocks:
            if block.name in ["shift", "shift_refence", "shift_relative"]:
                if not isinstance(block.value, list):
                    raise ValueError("Shift block value should be a list")
                other_values = [
                    v
                    for v in block.value  # type: ignore
                    if not any(
                        v["id"] == mp.dimension_id  # type: ignore
                        and v["name"] in mp.property_values  # type: ignore
                        for mp in cb.missing_properties
                    )
                ]
                if not other_values:
                    cb.active = False
        constraint_build_db.update_constraint_build(cb)
