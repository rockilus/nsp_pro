from core.constraint import Block, MissingProperty
from core.worker import WorkerProperty
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    constraint_db,
    fixed_assignment_db,
    objective_breach_db,
    request_db,
    worker_db,
    worker_dimension_db,
    worker_property_db,
)
from services.constraint_build_services.blocks_to_string import blocks_to_string


def delete_worker(worker_id: str) -> None:
    delete_worker_from_constraint_build(worker_id)
    delete_worker_property_from_constraint_build(worker_id)
    delete_worker_from_objective_breach(worker_id)
    delete_worker_from_constraint(worker_id)
    worker_property_db.delete_worker_properties_by_worker_id(worker_id)
    assignment_db.delete_assignments_by_worker_id(worker_id)
    fixed_assignment_db.delete_fixed_assignments_by_worker_id(worker_id)
    request_db.delete_requests_by_worker_id(worker_id)
    worker_db.delete_worker(worker_id)


def delete_worker_from_constraint_build(worker_id: str) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_worker_id(worker_id)
    for cb in cbs:
        new_blocks = []
        skip_to_next_cb = False
        for block in cb.blocks:
            if block.name == "worker":
                new_value = [
                    v
                    for v in block.value  # type: ignore
                    if v["id"] != worker_id  # type: ignore
                ]
                if new_value:
                    new_blocks.append(
                        Block(
                            name=block.name,
                            type=block.type,
                            value=new_value,  # type: ignore
                        )
                    )
                else:
                    constraint_build_db.delete_constraint_build(cb.id)
                    skip_to_next_cb = True
                    break
            else:
                new_blocks.append(block)
        if skip_to_next_cb:
            continue
        cb.blocks = new_blocks
        cb.text = blocks_to_string(new_blocks)
        constraint_build_db.update_constraint_build(cb)


# ["str", "int", "bool", "list"]
def delete_worker_property_from_constraint_build(worker_id: str) -> None:
    wps = worker_property_db.get_worker_properties_by_worker_id(worker_id)
    for wp in wps:
        wd = worker_dimension_db.get_worker_dimension_by_id(wp.worker_dimension_id)
        if wd.entry_type == "bool":
            continue
        wps_dim = worker_property_db.get_worker_properties_by_worker_dimension_id(
            wp.worker_dimension_id
        )
        wps_dim_same_value = [
            wpd for wpd in wps_dim if wpd.value == wp.value and wpd.id != wp.id
        ]
        if not wps_dim_same_value:
            update_cbs_for_change_worker_property(wp)
            # cbs = constraint_build_db.get_constraint_builds_by_wd_id_and_wp_value(
            #     wp.worker_dimension_id, wp.value
            # )
            # for cb in cbs:
            #     if any(
            #         mp.dimension_id == wp.worker_dimension_id
            #         for mp in cb.missing_properties
            #     ):
            #         for mp in cb.missing_properties:
            #             if mp.dimension_id == wp.worker_dimension_id:
            #                 mp.property_values.append(wp.value)
            #     else:
            #         cb.missing_properties.append(
            #             MissingProperty(
            #                 dimension_id=wp.worker_dimension_id,
            #                 property_values=[wp.value],
            #             )
            #         )
            #     for block in cb.blocks:
            #         if block.name == "worker":
            #             other_values = [
            #                 v
            #                 for v in block.value
            #                 if not any(
            #                     v["id"] == mp.dimension_id
            #                     and v["name"] in mp.property_values
            #                     for mp in cb.missing_properties
            #                 )
            #             ]
            #             if not other_values:
            #                 cb.active = False
            #     constraint_build_db.update_constraint_build(cb)


def update_cbs_for_change_worker_property(wp: WorkerProperty) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_wd_id_and_wp_value(
        wp.worker_dimension_id, wp.value
    )
    for cb in cbs:
        if any(
            mp.dimension_id == wp.worker_dimension_id for mp in cb.missing_properties
        ):
            for mp in cb.missing_properties:
                if mp.dimension_id == wp.worker_dimension_id:
                    mp.property_values.append(wp.value)
        else:
            cb.missing_properties.append(
                MissingProperty(
                    dimension_id=wp.worker_dimension_id,
                    property_values=[wp.value],
                )
            )
        for block in cb.blocks:
            if block.name == "worker":
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


def add_back_worker_property_to_constraint_build(wp: WorkerProperty) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_wd_id_and_wp_value(
        wp.worker_dimension_id, wp.value
    )
    for cb in cbs:
        new_mps = []
        for mp in cb.missing_properties:
            if (
                mp.dimension_id == wp.worker_dimension_id
                and wp.value in mp.property_values
            ):
                mp.property_values.remove(wp.value)
                if not mp.property_values:
                    continue
            new_mps.append(mp)
        cb.missing_properties = new_mps
        cb.active = True
        constraint_build_db.update_constraint_build(cb)


def delete_worker_from_objective_breach(worker_id: str) -> None:
    obs = objective_breach_db.get_objective_breaches_by_worker_id(worker_id)
    for ob in obs:
        new_vars = [v for v in ob.variables if v.worker_id != worker_id]
        if not new_vars:
            objective_breach_db.delete_objective_breach(ob.id)
            continue
        ob.variables = new_vars
        objective_breach_db.update_objective_breach(ob)


def delete_worker_from_constraint(worker_id: str) -> None:
    constraints = constraint_db.get_constraints_by_worker_id(worker_id)
    for constraint in constraints:
        new_targets = [w for w in constraint.worker_var.target_ids if w != worker_id]
        if not new_targets:
            constraint_db.delete_constraint(constraint.id)
            continue
        constraint.worker_var.target_ids = new_targets
        constraint_db.update_constraint(constraint)
