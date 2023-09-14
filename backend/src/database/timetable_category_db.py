from typing import List

from bson import ObjectId
from database.db import DB
from models import TimetableCategory, Timetable


class TimetableCategoryDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_timetable_category(
        self, timetable: Timetable
    ) -> TimetableCategory:
        timetable_category = TimetableCategory(
            _id=ObjectId(),
            label="Category 1",
            timetable=timetable,
        )
        timetable_category_saved = timetable_category.save()
        return timetable_category_saved

    def create_timetable_category(
        self,
        label: str,
        timetable: Timetable,
    ) -> TimetableCategory:
        timetable_category = TimetableCategory(
            _id=ObjectId(),
            label=label,
            timetable=timetable,
        )
        timetable_category_saved = timetable_category.save()
        return timetable_category_saved

    def get_timetable_categories(
        self,
    ) -> List[TimetableCategory]:
        # pylint: disable=no-member
        timetable_categories = TimetableCategory.objects.all()  # type: ignore
        return list(timetable_categories)

    def get_timetable_category_by_id(
        self,
        timetable_category_id: str,
    ) -> TimetableCategory:
        # pylint: disable=no-member
        timetable_category = TimetableCategory.objects.get(  # type: ignore
            _id=timetable_category_id
        )
        return timetable_category

    def update_timetable_category(
        self,
        timetable_category: TimetableCategory,
        label: str,
    ) -> TimetableCategory:
        timetable_category.label = label
        timetable_category_saved = timetable_category.save()
        return timetable_category_saved

    def delete_timetable_category(
        self,
        timetable_category: TimetableCategory,
    ) -> None:
        timetable_category.delete()
