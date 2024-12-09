from scripts.setup_database import breach_db, schedule_db, worker_db


def delete_worker(worker_id: str) -> None:
    delete_worker_from_schedule_quick_staffing(worker_id)
    worker_db.logical_delete_worker(worker_id)
    # delete_worker_from_objective_breach(worker_id)
    # assignment_db.delete_assignments_by_worker_id(worker_id)
    # request_db.delete_requests_by_worker_id(worker_id)


def delete_worker_from_objective_breach(worker_id: str) -> None:
    obs = breach_db.get_breaches_by_worker_id(worker_id)
    for ob in obs:
        new_vars = [v for v in ob.variables if v.worker_id != worker_id]
        if not new_vars:
            breach_db.delete_breach(ob.id)
            continue
        ob.variables = new_vars
        breach_db.update_breach(ob)


def delete_worker_from_schedule_quick_staffing(worker_id: str) -> None:
    schedules = schedule_db.get_schedule_quick_staffing_contain_worker_id(worker_id)
    for schedule in schedules:
        new_quick_staffings = [
            qs for qs in schedule.quick_staffings if qs.worker_id != worker_id
        ]
        schedule.quick_staffings = new_quick_staffings
        schedule_db.update_schedule(schedule)
