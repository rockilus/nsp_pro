from typing import List

from bson import ObjectId
from database.db import DB
from models import Timetable


class TimetableDB:
    def __init__(self, db: DB):
        self.db = db

    def create_timetable(
        self,
    ) -> Timetable:
        timetable = Timetable(
            _id=ObjectId(),
        )
        timetable_saved = timetable.save()
        return timetable_saved

    def get_timetables(
        self,
    ) -> List[Timetable]:
        # pylint: disable=no-member
        timetables = Timetable.objects.all()  # type: ignore
        return list(timetables)

    def get_timetable_by_id(self, timetable_id: str) -> Timetable:
        # pylint: disable=no-member
        print("timetable_id in get_timetable_by_id:", timetable_id)
        timetable = Timetable.objects.get(_id=timetable_id)  # type: ignore
        return timetable

    def update_timetable(
        self,
        label: str,
        timetable: Timetable,
    ) -> Timetable:
        timetable.label = label
        timetable_saved = timetable.save()
        return timetable_saved

    def delete_timetable(self, timetable: Timetable) -> None:
        timetable.delete()
