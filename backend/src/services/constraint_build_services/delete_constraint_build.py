from scripts.setup_database import constraint_build_db, schedule_db


def delete_constraint_build(team_id: str, cb_id: str) -> None:
    constraint_build_db.delete_constraint_build(cb_id)
    schedule_wip = schedule_db.get_schedule_wip_by_constraint_build_id(team_id, cb_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.remove(cb_id)
        schedule_db.update_schedule(schedule_wip)
