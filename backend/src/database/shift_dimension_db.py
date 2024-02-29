from typing import List

from bson import ObjectId

from core.shift import ShiftDimension
from database.db import DB
from models import ShiftDimension as ShiftDimensionDocument
from models import Team as TeamDocument


class ShiftDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_dimension(self, shift_dimension: ShiftDimension) -> ShiftDimension:
        sd_data = to_mongo_shift_dimension(shift_dimension)
        # pylint: disable=R0801
        sd_doc = ShiftDimensionDocument(
            id=str(ObjectId()),
            team=sd_data.team,
            name=sd_data.name,
            entry_type=sd_data.entry_type,
            entry_options=sd_data.entry_options,
        )
        sd_saved = sd_doc.save()
        return _from_mongo_shift_dimension(sd_saved)

    def get_shift_dimensions(self, team_id: str) -> List[ShiftDimension]:
        # pylint: disable=no-member
        shift_dimensions = ShiftDimensionDocument.objects.filter(  # type: ignore
            team=team_id
        )
        return [_from_mongo_shift_dimension(sd) for sd in list(shift_dimensions)]

    def get_shift_dimension_by_id(self, shift_dimension_id: str) -> ShiftDimension:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            id=shift_dimension_id
        )
        return _from_mongo_shift_dimension(shift_dimension)

    def get_shift_dimensions_by_entry_type(
        self, entry_type: str, team_id: str
    ) -> List[ShiftDimension]:
        # pylint: disable=no-member
        shift_dimensions = ShiftDimensionDocument.objects.filter(  # type: ignore
            entry_type=entry_type, team=team_id
        )
        return [_from_mongo_shift_dimension(sd) for sd in list(shift_dimensions)]

    def update_shift_dimension(self, shift_dimension: ShiftDimension) -> ShiftDimension:
        sd_doc = to_mongo_shift_dimension(shift_dimension)
        sd_saved = sd_doc.save()
        return _from_mongo_shift_dimension(sd_saved)

    def delete_shift_dimension(self, shift_dimension_id: str) -> None:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            id=shift_dimension_id
        )
        shift_dimension.delete()


def to_mongo_shift_dimension(
    dataclass_obj: ShiftDimension,
) -> ShiftDimensionDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return ShiftDimensionDocument(
        # pylint: disable=R0801
        id=dataclass_obj.id,
        team=team,
        name=dataclass_obj.name,
        entry_type=dataclass_obj.entry_type,
        entry_options=dataclass_obj.entry_options,
    )


def _from_mongo_shift_dimension(
    doc_obj: ShiftDimensionDocument,
) -> ShiftDimension:
    return ShiftDimension(
        # pylint: disable=R0801
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        name=doc_obj.name,
        entry_type=doc_obj.entry_type,  # type: ignore
        entry_options=[*doc_obj.entry_options],
    )
