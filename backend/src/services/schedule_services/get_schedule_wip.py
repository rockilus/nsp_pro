from datetime import date, timedelta
from typing import List

from core import Schedule
from scripts.setup_database import schedule_db


def get_schedule_wip(schedules: List[Schedule], team_id: str) -> Schedule:
    schedule_wip = next((s for s in schedules if s.status == "wip"), None)
    if schedule_wip:
        return schedule_wip
    last_date = max(s.end_date for s in schedules) if schedules else None
    today_date = date.today()
    start_date = (
        today_date
        if not last_date or last_date < today_date
        else last_date + timedelta(days=1)
    )
    end_date = start_date + timedelta(days=30)
    return schedule_db.create_schedule(
        Schedule(
            id="",
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            solve_status="Not solved",
            status="wip",
            missing_coverage_dates=[],
        )
    )
