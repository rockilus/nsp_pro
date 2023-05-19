from typing import List
from datetime import datetime

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

    def get_schedules_by_hospital_id(
        self, hospital_id: str, start_date: datetime, end_date: datetime
    ) -> List[Schedule]:
        # pylint: disable=no-member
        schedules = Schedule.objects(  # type: ignore
            hospital=hospital_id,
            start_date__lte=end_date,
            end_date__gte=start_date,
            active=True,
        )
        return list(schedules)
