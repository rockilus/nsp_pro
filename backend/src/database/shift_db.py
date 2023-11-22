from datetime import datetime
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
            start_time=ShiftDB.round_time(datetime.now()),
            end_time=ShiftDB.round_time(datetime.now()),
            is_time_off=False,
            staffing=1,
            color="grey",
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
        document = to_mongo_shift(shift)
        document_saved = document.save()
        return _from_mongo_shift(document_saved)

    def delete_shift(self, shift_id: str) -> None:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        shift.delete()

    @staticmethod
    def round_time(dt: datetime) -> datetime:
        minutes = (dt.minute // 15) * 15
        return dt.replace(minute=minutes, second=0, microsecond=0)


# Mappers
def to_mongo_shift(dataclass_obj: Shift) -> ShiftDocument:
    return ShiftDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
        start_time=dataclass_obj.start_time,
        end_time=dataclass_obj.end_time,
        staffing=dataclass_obj.staffing,
        is_time_off=dataclass_obj.is_time_off,
        color=dataclass_obj.color,
    )


def _from_mongo_shift(doc_obj: ShiftDocument) -> Shift:
    return Shift(
        id=doc_obj.id,
        name=str(doc_obj.name) if doc_obj.name is not None else "",
        start_time=doc_obj.start_time,
        end_time=doc_obj.end_time,
        staffing=doc_obj.staffing,
        is_time_off=doc_obj.is_time_off,
        color=doc_obj.color,
    )
