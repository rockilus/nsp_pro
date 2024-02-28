from typing import List

from bson import ObjectId

from core.shift import Shift
from database.db import DB
from models import Shift as ShiftDocument
from models import Team as TeamDocument


class ShiftDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift(self, shift: Shift) -> Shift:
        s_data = to_mongo_shift(shift)
        s_doc = ShiftDocument(
            id=str(ObjectId()),
            team=s_data.team,
            name=s_data.name,
            start_time=s_data.start_time,
            end_time=s_data.end_time,
            is_time_off=s_data.is_time_off,
            staffing=s_data.staffing,
            color=s_data.color,
        )
        s_saved = s_doc.save()
        return _from_mongo_shift(s_saved)

    def get_shifts(self, team_id: str) -> List[Shift]:
        # pylint: disable=no-member
        shifts = ShiftDocument.objects(team=team_id)  # type: ignore
        return [_from_mongo_shift(s) for s in list(shifts)]

    def get_shift_by_id(self, shift_id: str) -> Shift:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        return _from_mongo_shift(shift)

    def update_shift(self, shift: Shift) -> Shift:
        s_doc = to_mongo_shift(shift)
        s_saved = s_doc.save()
        return _from_mongo_shift(s_saved)

    def delete_shift(self, shift_id: str) -> None:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=shift_id)  # type: ignore
        shift.delete()


# Mappers
def to_mongo_shift(dataclass_obj: Shift) -> ShiftDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return ShiftDocument(
        id=dataclass_obj.id,
        team=team,
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
        team_id=doc_obj.team.id,
        name=str(doc_obj.name) if doc_obj.name is not None else "",
        start_time=doc_obj.start_time,
        end_time=doc_obj.end_time,
        staffing=doc_obj.staffing,
        is_time_off=doc_obj.is_time_off,
        color=doc_obj.color,
    )
