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
            name="",
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

    def update_shift(self, shift: Shift) -> Shift:
        # pylint: disable=no-member
        shift_document = ShiftDocument.objects.get(id=shift.id)  # type: ignore
        shift_document.name = shift.name
        shift_document.save()
        return _from_mongo_shift(shift_document)

    def delete_shift(self, shift_id: str) -> None:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        shift.delete()


# Mappers
def to_mongo_shift(dataclass_obj: Shift) -> ShiftDocument:
    return ShiftDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
    )


def _from_mongo_shift(doc_obj: ShiftDocument) -> Shift:
    return Shift(
        id=doc_obj.id,
        name=str(doc_obj.name) if doc_obj.name is not None else "",
    )
