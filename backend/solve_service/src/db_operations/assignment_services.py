from typing import List, Tuple

# from shared.database import DatabaseCollections
from shared.database_pymongo.database_collections import DatabaseCollections
from shared.schemas import Assignment, Schedule, ScheduleStatus


# pylint: disable=too-many-locals, too-many-statements
def get_fixed_assignments(
    schedule: Schedule, collections: DatabaseCollections
) -> Tuple[List[Assignment], List[Assignment]]:
    team_schedules = collections.schedule_db.get_schedules(schedule.team_id)
    as_hist = collections.assignment_db.get_assignments_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.VALIDATED]
    )  # validated assignments
    as_wip_fixed = collections.assignment_db.get_assignments_fixed_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.CAMPAIGN]
    )  # assignments wip and fixed
    return as_hist, as_wip_fixed


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
