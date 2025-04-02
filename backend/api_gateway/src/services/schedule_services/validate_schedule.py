from shared.schemas import Schedule, ScheduleSolveStatus, ScheduleStatus

from src.scripts.setup_database import schedule_db


def validate_schedule(schedule_id: str) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    if not schedule:
        raise ValueError(f"Schedule with id {schedule_id} not found")
    if schedule.status == ScheduleSolveStatus.NOT_SOLVED:
        raise ValueError(f"Schedule with id {schedule_id} not solved")
    schedule.status = ScheduleStatus.VALIDATED
    schedule = schedule_db.update_schedule(schedule)
    return schedule
