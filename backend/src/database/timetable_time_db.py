from typing import List

from bson import ObjectId
from database.db import DB
from models import TimetableTime, Timetable


class TimetableTimeDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_timetable_times(
        self, timetable: Timetable
    ) -> List[TimetableTime]:
        days_of_week = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        for day in days_of_week:
            timetable_time = TimetableTime(
                _id=ObjectId(),
                label=day,
                timetable=timetable,
            )
            timetable_time.save()
        # pylint: disable=no-member
        timetable_times = TimetableTime.objects.filter(  # type: ignore
            timetable=timetable
        )
        return list(timetable_times)

    def create_timetable_time(
        self,
        label: str,
        timetable: Timetable,
    ) -> TimetableTime:
        timetable_time = TimetableTime(
            _id=ObjectId(),
            label=label,
            timetable=timetable,
        )
        timetable_time_saved = timetable_time.save()
        return timetable_time_saved

    def get_timetable_times(
        self,
    ) -> List[TimetableTime]:
        # pylint: disable=no-member
        timetable_times = TimetableTime.objects.all()  # type: ignore
        return list(timetable_times)

    def get_timetable_time_by_id(
        self,
        timetable_time_id: str,
    ) -> TimetableTime:
        # pylint: disable=no-member
        timetable_time = TimetableTime.objects.get(  # type: ignore
            _id=timetable_time_id
        )
        return timetable_time

    def get_timetable_times_by_timetable(
        self,
        timetable: Timetable,
    ) -> List[TimetableTime]:
        # pylint: disable=no-member
        timetable_times = TimetableTime.objects.filter(  # type: ignore
            timetable=timetable
        )
        return list(timetable_times)

    def update_timetable_time(
        self,
        timetable_time: TimetableTime,
        label: str,
    ) -> TimetableTime:
        timetable_time.label = label
        timetable_time_saved = timetable_time.save()
        return timetable_time_saved

    def delete_timetable_time(
        self,
        timetable_time: TimetableTime,
    ) -> None:
        timetable_time.delete()
