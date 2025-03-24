from scripts.setup_database import (
    assignment_db,
    breach_db,
    daily_shift_demand_db,
    schedule_db,
)


def delete_schedule(schedule_id: str) -> None:
    assignment_db.delete_assignments_by_schedule_id(schedule_id)
    breach_db.delete_breaches_by_schedule_id(schedule_id)
    daily_shift_demand_db.delete_daily_shift_demands_by_schedule_id(schedule_id)
    schedule_db.delete_schedule(schedule_id)
