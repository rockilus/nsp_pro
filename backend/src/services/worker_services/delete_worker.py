from scripts.setup_database import (
    assignment_db,
    constraint_db,
    objective_breach_db,
    request_db,
    schedule_db,
    worker_db,
    worker_property_db,
)


def delete_worker(worker_id: str) -> None:
    delete_worker_from_objective_breach(worker_id)
    # delete_worker_from_constraint(worker_id)
    delete_worker_from_schedule_quick_staffing(worker_id)
    worker_property_db.delete_worker_properties_by_worker_id(worker_id)
    assignment_db.delete_assignments_by_worker_id(worker_id)
    request_db.delete_requests_by_worker_id(worker_id)
    worker_db.logical_delete_worker(worker_id)


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


def delete_worker_from_schedule_quick_staffing(worker_id: str) -> None:
    schedules = schedule_db.get_schedule_quick_staffing_contain_worker_id(worker_id)
    for schedule in schedules:
        new_quick_staffings = [
            qs for qs in schedule.quick_staffings if qs.worker_id != worker_id
        ]
        schedule.quick_staffings = new_quick_staffings
        schedule_db.update_schedule(schedule)
