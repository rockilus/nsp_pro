from typing import List

from bson import ObjectId
from database.db import DB
from models import Shift


class ShiftDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift(
        self,
    ) -> Shift:
        shift = Shift(
            _id=ObjectId(),
        )
        shift_saved = shift.save()
        return shift_saved

    def get_shifts(
        self,
    ) -> List[Shift]:
        # pylint: disable=no-member
        shifts = Shift.objects.all()  # type: ignore
        return list(shifts)

    def get_shift_by_id(self, shift_id: str) -> Shift:
        # pylint: disable=no-member
        print("shift_id in get_shift_by_id:", shift_id)
        shift = Shift.objects.get(_id=shift_id)  # type: ignore
        return shift

    def delete_shift(self, shift: Shift) -> None:
        shift.delete()
