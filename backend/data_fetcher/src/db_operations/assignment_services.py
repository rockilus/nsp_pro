from typing import List, Tuple

from shared.database import DatabaseCollections
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
