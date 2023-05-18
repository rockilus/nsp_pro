from typing import List

from database.db import DB
from models import Schedule


# pylint: disable=too-few-public-methods
class ScheduleDB:
    def __init__(self, db: DB):
        self.db = db

    def save_schedule(
        self,
        schedule: Schedule,
    ) -> Schedule:
        # pylint: disable=protected-access
        schedule_saved = schedule.save()
        return schedule_saved

    def get_schedule_by_hospital_id(self, hospital_id: str) -> List[Schedule]:
        # pylint: disable=no-member
        schedules = Schedule.objects.filter(  # type: ignore
            hospital=hospital_id
        )
        return list(schedules)
