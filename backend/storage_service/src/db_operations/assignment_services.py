from typing import List

from shared.schemas import Assignment, Schedule

from db_operations.setup_database import assignment_db


def save_assignments(
    assignments: List[Assignment],
    schedule: Schedule,
    fixed_assignments: List[Assignment],
) -> List[Assignment]:
    assignment_db.delete_assignments_by_schedule_id(schedule.id)
    if not assignments:
        return []
    for assignment in assignments:
        for fixed_assignment in fixed_assignments:
            if (
                assignment.date == fixed_assignment.date
                and assignment.shift_id == fixed_assignment.shift_id
                and assignment.worker_id == fixed_assignment.worker_id
            ):
                assignment.fixed = True
                break
    out = assignment_db.create_assignments(assignments)
    return out
