from typing import List

from bson import ObjectId

from core.shift import ShiftDimension
from database.db import DB
from models import ShiftDimension as ShiftDimensionDocument


class ShiftDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_dimension(
        self,
        name: str,
        entry_type: str,
        entry_options: List[str],
    ) -> ShiftDimension:
        # pylint: disable=R0801
        shift_dimension = ShiftDimensionDocument(
            id=str(ObjectId()),
            name=name,
            entry_type=entry_type,
            entry_options=entry_options,
        )
        shift_dimension_saved = shift_dimension.save()
        return _from_mongo_shift_dimension(shift_dimension_saved)

    def get_shift_dimensions(
        self,
    ) -> List[ShiftDimension]:
        # pylint: disable=no-member
        shift_dimensions = ShiftDimensionDocument.objects.all()  # type: ignore
        return [_from_mongo_shift_dimension(sd) for sd in list(shift_dimensions)]

    def get_shift_dimension_by_id(
        self,
        shift_dimension_id: str,
    ) -> ShiftDimension:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            id=shift_dimension_id
        )
        return _from_mongo_shift_dimension(shift_dimension)

    def get_shift_dimension_by_name(
        self,
        shift_dimension_name: str,
    ) -> ShiftDimension:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            name=shift_dimension_name
        )
        return _from_mongo_shift_dimension(shift_dimension)

    def get_shift_dimensions_by_entry_type(
        self,
        entry_type: str,
    ) -> List[ShiftDimension]:
        # pylint: disable=no-member
        shift_dimensions = ShiftDimensionDocument.objects.filter(  # type: ignore
            entry_type=entry_type
        )
        return [_from_mongo_shift_dimension(sd) for sd in list(shift_dimensions)]

    def update_shift_dimension(
        # pylint: disable=too-many-arguments
        self,
        shift_dimension: ShiftDimension,
    ) -> ShiftDimension:
        document = to_mongo_shift_dimension(shift_dimension)
        document_saved = document.save()
        return _from_mongo_shift_dimension(document_saved)

    def delete_shift_dimension(self, shift_dimension_id: str) -> None:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            id=shift_dimension_id
        )
        shift_dimension.delete()


def to_mongo_shift_dimension(
    dataclass_obj: ShiftDimension,
) -> ShiftDimensionDocument:
    return ShiftDimensionDocument(
        # pylint: disable=R0801
        id=dataclass_obj.id,
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
        name=doc_obj.name,
        entry_type=doc_obj.entry_type,  # type: ignore
        entry_options=[*doc_obj.entry_options],
    )
