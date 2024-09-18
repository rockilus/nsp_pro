# pylint: disable=R0801
from scripts.setup_database import (
    assignment_db,
    constraint_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    shift_property_db,
)


def delete_shift(shift_id: str) -> None:
    delete_shift_from_objective_breach(shift_id)
    delete_shift_from_constraint(shift_id)
    delete_shift_from_schedule_quick_staffing(shift_id)
    shift_property_db.delete_shift_properties_by_shift_id(shift_id)
    shift_demand_db.delete_shift_demands_by_shift_id(shift_id)
    assignment_db.delete_assignments_by_shift_id(shift_id)
    request_db.delete_requests_by_shift_id(shift_id)
    shift_db.delete_shift(shift_id)


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


def delete_shift_from_schedule_quick_staffing(shift_id: str) -> None:
    schedules = schedule_db.get_schedule_quick_staffing_contain_shift_id(shift_id)
    for schedule in schedules:
        new_quick_staffings = [
            qs for qs in schedule.quick_staffings if qs.shift_id != shift_id
        ]
        schedule.quick_staffings = new_quick_staffings
        schedule_db.update_schedule(schedule)
