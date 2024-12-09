from typing import List, Tuple

from shared.schemas import Assignment, Schedule, ScheduleStatus

from db_operations.setup_database import assignment_db, schedule_db


# pylint: disable=too-many-locals, too-many-statements
def get_fixed_assignments(
    schedule: Schedule,
) -> Tuple[List[Assignment], List[Assignment]]:
    team_schedules = schedule_db.get_schedules(schedule.team_id)
    as_hist = assignment_db.get_assignments_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.VALIDATED]
    )  # validated assignments
    as_wip_fixed = assignment_db.get_assignments_fixed_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.CAMPAIGN]
    )  # assignments wip and fixed
    return as_hist, as_wip_fixed
