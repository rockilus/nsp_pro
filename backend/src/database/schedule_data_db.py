from datetime import datetime
from typing import List

from database.db import DB
from models import Schedule, ScheduleData


# pylint: disable=too-few-public-methods
class ScheduleDataDB:
    def __init__(self, db: DB):
        self.db = db

    def save_schedule_data_list(
        self,
        schedule_data_list: List[ScheduleData],
    ) -> Schedule:
        # pylint: disable=no-member
        schedule_data_list_saved = ScheduleData.objects.insert(  # type: ignore
            schedule_data_list
        )
        return schedule_data_list_saved

    def get_schedule_by_hospital_id(
        self, hospital_id: str, start_date: datetime, end_date: datetime
    ) -> List[Schedule]:
        # pylint: disable=no-member
        schedule_data = ScheduleData.objects(  # type: ignore
            hospital=hospital_id,
            date__gte=start_date,
            date__lte=end_date,
        )
        # .select_related("user")
        return list(schedule_data)

    def get_schedule_data_by_schedule_ids(
        self, schedule_ids: List[str], start_date: datetime, end_date: datetime
    ) -> List[Schedule]:
        # pylint: disable=no-member
        schedule_data = ScheduleData.objects(  # type: ignore
            schedule__in=schedule_ids,
            date__gte=start_date,
            date__lte=end_date,
        )
        # ).select_related(max_depth=1)
        # ).only("user")
        return list(schedule_data)
