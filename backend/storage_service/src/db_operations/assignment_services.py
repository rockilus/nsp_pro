from typing import List

from shared.database import DatabaseCollections
from shared.schemas import Assignment, Schedule


def save_assignments(
    assignments: List[Assignment],
    schedule: Schedule,
    fixed_assignments: List[Assignment],
    collections: DatabaseCollections,
) -> List[Assignment]:
    collections.assignment_db.delete_assignments_by_schedule_id(schedule.id)
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
    out = collections.assignment_db.create_assignments(assignments)
    return out
