from typing import List

from bson import ObjectId
from core.shift import Shift
from database.db import DB
from models import Shift as ShiftDocument


class ShiftDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift(
        self,
    ) -> Shift:
        shift = ShiftDocument(
            id=str(ObjectId()),
        )
        shift_saved = shift.save()
        return _from_mongo_shift(shift_saved)

    def get_shifts(
        self,
    ) -> List[Shift]:
        # pylint: disable=no-member
        shifts = ShiftDocument.objects.all()  # type: ignore
        return [_from_mongo_shift(s) for s in list(shifts)]

    def get_shift_by_id(self, shift_id: str) -> Shift:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        return _from_mongo_shift(shift)

    def delete_shift(self, shift_id: str) -> None:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        shift.delete()


# Mappers
def to_mongo_shift(dataclass_obj: Shift) -> ShiftDocument:
    return ShiftDocument(
        id=dataclass_obj.id,
    )


def _from_mongo_shift(doc_obj: ShiftDocument) -> Shift:
    return Shift(
        id=doc_obj.id,
    )
