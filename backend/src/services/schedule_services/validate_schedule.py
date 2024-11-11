from typing import List

from core import Assignment, ScheduleStatus
from scripts.setup_database import assignment_db, schedule_db


def validate_schedule(schedule_id: str) -> List[Assignment]:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    if not schedule:
        raise ValueError(f"Schedule with id {schedule_id} not found")
    if schedule.status == "not solved":
        raise ValueError(f"Schedule with id {schedule_id} not solved")
    assignments = assignment_db.get_assignments_by_schedule_id(schedule_id)
    schedule.status = ScheduleStatus.VALIDATED
    schedule = schedule_db.update_schedule(schedule)
    updated_assignments = []
    for a in assignments:
        a.status = "validated"
        updated_assignments.append(a)
    updated_assignments = assignment_db.update_assignments(updated_assignments)
    return updated_assignments
