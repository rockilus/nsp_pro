# pylint: disable=R0801
from core.constraint import MissingProperty
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    constraint_db,
    fixed_assignment_db,
    objective_breach_db,
    request_db,
    shift_db,
    shift_dimension_db,
    shift_property_db,
)
from services.constraint_build_services.delete_constraint_build_item import (
    delete_item_with_id_from_constraint_build,
)


def delete_shift(shift_id: str) -> None:
    delete_shift_from_constraint_build(shift_id)
    delete_shift_property_from_constraint_build(shift_id)
    delete_shift_from_objective_breach(shift_id)
    delete_shift_from_constraint(shift_id)
    shift_property_db.delete_shift_properties_by_shift_id(shift_id)
    assignment_db.delete_assignments_by_shift_id(shift_id)
    fixed_assignment_db.delete_fixed_assignments_by_shift_id(shift_id)
    request_db.delete_requests_by_shift_id(shift_id)
    shift_db.delete_shift(shift_id)


def delete_shift_from_constraint_build(shift_id: str) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_shift_id(shift_id)
    delete_item_with_id_from_constraint_build(
        shift_id, cbs, ["shift", "shift_reference", "shift_relative"]
    )


def delete_shift_property_from_constraint_build(shift_id: str) -> None:
    sps = shift_property_db.get_shift_properties_by_shift_id(shift_id)
    for sp in sps:
        sd = shift_dimension_db.get_shift_dimension_by_id(sp.shift_dimension_id)
        if sd.entry_type == "bool":
            continue
        sps_dim = shift_property_db.get_shift_properties_by_shift_dimension_id(
            sp.shift_dimension_id
        )
        if sd.entry_type == "list":
            if isinstance(sp.value, list):
                for sp_v in sp.value:
                    sps_dim_same_value = [
                        spd
                        for spd in sps_dim
                        if sp_v in spd.value and spd.id != sp.id  # type: ignore
                    ]
                    if not sps_dim_same_value:
                        update_cbs_for_change_shift_property(
                            sp.shift_dimension_id, sp_v
                        )
            else:
                raise ValueError(
                    "Shift property value is not a list for list dimension"
                )
        else:
            sps_dim_same_value = [
                spd for spd in sps_dim if spd.value == sp.value and spd.id != sp.id
            ]
            if not sps_dim_same_value:
                update_cbs_for_change_shift_property(
                    sp.shift_dimension_id, sp.value  # type: ignore
                )


def update_cbs_for_change_shift_property(
    shift_dimension_id: str, value: str | int | float | bool
) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_sd_id_and_sp_value(
        shift_dimension_id, value
    )
    for cb in cbs:
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


def add_back_shift_property_to_constraint_build(
    shift_dimension_id: str, value: str | int | float | bool
) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_sd_id_and_sp_value(
        shift_dimension_id, value
    )
    for cb in cbs:
        new_mps = []
        for mp in cb.missing_properties:
            if mp.dimension_id == shift_dimension_id and value in mp.property_values:
                mp.property_values.remove(value)
                if not mp.property_values:
                    continue
            new_mps.append(mp)
        cb.missing_properties = new_mps
        cb.active = True
        constraint_build_db.update_constraint_build(cb)


def delete_shift_from_objective_breach(shift_id: str) -> None:
    obs = objective_breach_db.get_objective_breaches_by_shift_id(shift_id)
    for ob in obs:
        new_vars = [v for v in ob.variables if v.shift_id != shift_id]
        if not new_vars:
            objective_breach_db.delete_objective_breach(ob.id)
            continue
        ob.variables = new_vars
        objective_breach_db.update_objective_breach(ob)


def delete_shift_from_constraint(shift_id: str) -> None:
    constraints = constraint_db.get_constraints_by_shift_id_in_target(shift_id)
    for constraint in constraints:
        new_targets = [s for s in constraint.shift_var.target_ids if s != shift_id]
        if not new_targets:
            constraint_db.delete_constraint(constraint.id)
            continue
        constraint.shift_var.target_ids = new_targets
        constraint_db.update_constraint(constraint)
    constraints = constraint_db.get_constraints_by_shift_id_in_reference(shift_id)
    for constraint in constraints:
        new_references = [
            s for s in constraint.shift_var.reference_ids if s != shift_id
        ]
        if not new_references:
            constraint_db.delete_constraint(constraint.id)
            continue
        constraint.shift_var.reference_ids = new_references
        constraint_db.update_constraint(constraint)
    constraints = constraint_db.get_constraints_by_shift_id_in_relative(shift_id)
    for constraint in constraints:
        new_relatives = [s for s in constraint.shift_var.relative_ids if s != shift_id]
        if not new_relatives:
            constraint_db.delete_constraint(constraint.id)
            continue
        constraint.shift_var.relative_ids = new_relatives
        constraint_db.update_constraint(constraint)
