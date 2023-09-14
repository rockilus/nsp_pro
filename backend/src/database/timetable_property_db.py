from typing import List, Union

from bson import ObjectId
from database.db import DB
from models import (
    Timetable,
    TimetableCategory,
    TimetableProperty,
    TimetableTime,
)


class TimetablePropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_timetable_property(
        self,
        timetable: Timetable,
        timetable_category: TimetableCategory,
        timetable_time: TimetableTime,
        value: Union[str, int, float, bool],
    ) -> TimetableProperty:
        timetable_property = TimetableProperty(
            _id=ObjectId(),
            value=value,
            timetable=timetable,
            timetable_category=timetable_category,
            timetable_time=timetable_time,
        )
        timetable_property_saved = timetable_property.save()
        return timetable_property_saved

    def get_timetable_properties_by_timetable(
        self,
        timetable: Timetable,
    ) -> List[TimetableProperty]:
        # pylint: disable=no-member
        timetable_properties = (
            TimetableProperty.objects.filter(  # type: ignore
                timetable=timetable
            )
        )
        return list(timetable_properties)

    def get_timetable_properties_by_timetable_category(
        self,
        timetable_category: TimetableCategory,
    ) -> List[TimetableProperty]:
        # pylint: disable=no-member
        timetable_properties = (
            TimetableProperty.objects.filter(  # type: ignore
                timetable_category=timetable_category
            )
        )
        return list(timetable_properties)

    def get_timetable_property_by_id(
        self, timetable_property_id: str
    ) -> TimetableProperty:
        # pylint: disable=no-member
        print("timetable_id in get_timetable_by_id:", timetable_property_id)
        timetable_property = TimetableProperty.objects.get(  # type: ignore
            _id=timetable_property_id
        )
        return timetable_property

    def get_timetable_property_by_timetable_and_category(
        self,
        timetable: Timetable,
        timetable_category: TimetableCategory,
    ) -> TimetableProperty:
        # pylint: disable=no-member
        timetable_property = (
            TimetableProperty.objects.filter(  # type: ignore
                timetable=timetable
            )
            .filter(timetable_category=timetable_category)
            .first()
        )
        return timetable_property

    def update_timetable_property(
        self,
        timetable_property: TimetableProperty,
        value: int,
    ) -> TimetableProperty:
        timetable_property.value = value
        timetable_property_saved = timetable_property.save()
        return timetable_property_saved

    def delete_timetable_properties(
        self, timetable_properties: List[TimetableProperty]
    ) -> None:
        for timetable_property in timetable_properties:
            timetable_property.delete()
