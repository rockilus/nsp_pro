from typing import List

from core import Breach, Schedule
from scripts.setup_database import breach_db


def save_breaches(schedule: Schedule, breaches: List[Breach]) -> List[Breach]:
    breach_db.delete_breaches_by_schedule_id(schedule.id)
    if not breaches:
        return []
    out = breach_db.create_breaches(breaches)
    return out
