from datetime import date, datetime

import pytz
from scripts.setup_database import assignment_db, schedule_db


def to_past_schedules_and_assignments() -> None:
    today = date.today()
    today_utc = datetime.now(pytz.utc).date()

    assignments = assignment_db.get_wip_validated_assignments_before_date(
        today
    )
    schedules = schedule_db.get_wip_validated_schedules_before_date(today)
    for schedule in schedules:
        schedule.status = "past"
        schedule_db.update_schedule(schedule)
    for assignment in assignments:
        assignment.status = "past"
        assignment_db.update_assignment(assignment)
