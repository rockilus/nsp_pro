from datetime import date, timedelta
from typing import List

from scripts.setup_database import constraint_build_db, schedule_db

from shared.schemas import Schedule, ScheduleSolveStatus, ScheduleStatus


def get_schedule_campaign(schedules: List[Schedule], team_id: str) -> Schedule:
    schedule_campaign = next(
        (s for s in schedules if s.status == ScheduleStatus.CAMPAIGN), None
    )
    if schedule_campaign:
        return schedule_campaign
    last_date = max(s.end_date for s in schedules) if schedules else None
    today_date = date.today()
    start_date = (
        today_date
        if not last_date or last_date < today_date
        else last_date + timedelta(days=1)
    )
    end_date = start_date + timedelta(days=30)
    cbs = constraint_build_db.get_constraint_builds(team_id)
    return schedule_db.create_schedule(
        Schedule(
            id="",
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[cb.id for cb in cbs],
            quick_staffings=[],
        )
    )
