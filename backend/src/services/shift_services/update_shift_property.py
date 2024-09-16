# pylint: disable=R0801
from core import ShiftDimension, ShiftProperty
from scripts.setup_database import (
    constraint_build_db,
    shift_dimension_db,
    shift_property_db,
)
from services.constraint_build_services.update_constraint_build import (
    update_cbs_change_shift_property_remove_old_value,
)


def create_or_update_shift_property(
    shift_property: ShiftProperty,
) -> ShiftProperty:
    if shift_property.id == "":
        new_sp = create_shift_property(shift_property)
    else:
        new_sp = update_shift_property(shift_property)
    return new_sp


def create_shift_property(shift_property: ShiftProperty) -> ShiftProperty:
    new_sp = shift_property_db.create_shift_property(shift_property)
    sd = shift_dimension_db.get_shift_dimension_by_id(new_sp.shift_dimension_id)
    add_back_shift_property_to_constraint_build(
        sd,
        new_sp,
    )
    return new_sp


def update_shift_property(new_sp: ShiftProperty) -> ShiftProperty:
    old_sp = shift_property_db.get_shift_property_by_id(new_sp.id)
    if old_sp is None:
        raise ValueError("Shift property not found")
    sd = shift_dimension_db.get_shift_dimension_by_id(old_sp.shift_dimension_id)
    sps_dim = shift_property_db.get_shift_properties_by_shift_dimension_id(
        old_sp.shift_dimension_id
    )
    if sd.entry_type == "list":
        if not isinstance(old_sp.value, list) or not isinstance(new_sp.value, list):
            raise ValueError("Shift property value is not a list for list dimension")
        for sp_v in set(old_sp.value) - set(
            new_sp.value
        ):  # iterate through the values that were in old_sp but not in new_sp
            sps_dim_same_value = [
                spd
                for spd in sps_dim
                if sp_v in spd.value and spd.id != old_sp.id  # type: ignore
            ]
            if not sps_dim_same_value:
                update_cbs_change_shift_property_remove_old_value(
                    old_sp.shift_dimension_id, sp_v
                )
    elif old_sp.value != new_sp.value:
        sps_dim_same_value = [
            spd for spd in sps_dim if spd.value == old_sp.value and spd.id != old_sp.id
        ]
        if not sps_dim_same_value:
            update_cbs_change_shift_property_remove_old_value(
                old_sp.shift_dimension_id, old_sp.value  # type: ignore
            )
    new_sp_saved = shift_property_db.update_shift_property(new_sp)
    add_back_shift_property_to_constraint_build(sd, new_sp_saved)
    return new_sp_saved


def add_back_shift_property_to_constraint_build(
    shift_dimension: ShiftDimension, shift_property: ShiftProperty
) -> None:
    if isinstance(shift_property.value, list):
        for value in shift_property.value:
            add_back_shift_property_value_to_constraint_build(shift_dimension, value)
    else:
        add_back_shift_property_value_to_constraint_build(
            shift_dimension, shift_property.value
        )


def add_back_shift_property_value_to_constraint_build(
    shift_dimension: ShiftDimension, value: str | int | float | bool
) -> None:
    if shift_dimension.entry_type == "bool":
        mp_value: str | int | float | bool = (
            shift_dimension.name if value else "not" + shift_dimension.name
        )
    else:
        mp_value = value
    cbs = constraint_build_db.get_constraint_builds_by_sd_id_and_sp_value(
        shift_dimension.id, mp_value
    )
    for cb in cbs:
        new_mps = []
        for mp in cb.missing_properties:
            if mp.dimension_id == shift_dimension.id and mp_value in mp.property_values:
                mp.property_values.remove(mp_value)
                if not mp.property_values:
                    continue
            new_mps.append(mp)
        cb.missing_properties = new_mps
        # Can't just active a constraint here, need to know if there was any
        # other deactivation reasons
        cb.active = True
        constraint_build_db.update_constraint_build(cb)
