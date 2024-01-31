from typing import List, Union

from bson import ObjectId

from core.shift import Shift, ShiftDimension, ShiftProperty
from database.db import DB
from database.shift_db import to_mongo_shift
from database.shift_dimension_db import to_mongo_shift_dimension
from models import Shift as ShiftDocument
from models import ShiftDimension as ShiftDimensionDocument
from models import ShiftProperty as ShiftPropertyDocument


class ShiftPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_property(
        self,
        shift: Shift,
        shift_dimension: ShiftDimension,
        value: Union[str, int, float, bool],
    ) -> ShiftProperty:
        shift_property = ShiftPropertyDocument(
            id=str(ObjectId()),
            value=value,
            shift=to_mongo_shift(shift),
            shift_dimension=to_mongo_shift_dimension(shift_dimension),
        )
        shift_property_saved = shift_property.save()
        return _from_mongo_shift_property(shift_property_saved)

    def get_shift_properties_by_shift(
        self,
        shift: Shift,
    ) -> List[ShiftProperty]:
        # pylint: disable=no-member
        shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
            shift=shift.id
        )
        return [_from_mongo_shift_property(sp) for sp in list(shift_properties)]

    def get_shift_properties_by_shift_dimension(
        self,
        shift_dimension: ShiftDimension,
    ) -> List[ShiftProperty]:
        # pylint: disable=no-member
        shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
            shift_dimension=shift_dimension.id
        )
        return [_from_mongo_shift_property(sp) for sp in list(shift_properties)]

    def get_shift_property_by_id(self, shift_property_id: str) -> ShiftProperty:
        # pylint: disable=no-member
        shift_property = ShiftPropertyDocument.objects.get(  # type: ignore
            id=shift_property_id
        )
        return _from_mongo_shift_property(shift_property)

    def get_shift_property_by_shift_and_dimension(
        self,
        shift: Shift,
        shift_dimension: ShiftDimension,
    ) -> Union[ShiftProperty, None]:
        # pylint: disable=no-member
        shift_property = (
            ShiftPropertyDocument.objects.filter(shift=shift.id)  # type: ignore
            .filter(shift_dimension=shift_dimension.id)
            .first()
        )
        return _from_mongo_shift_property(shift_property) if shift_property else None

    def get_shifts_id_by_dim_and_prop(self):
        pipeline = [
            {
                "$group": {
                    "_id": "$shift_dimension",
                    "properties": {"$push": {"value": "$value", "shift": "$shift"}},
                }
            },
            {"$unwind": "$properties"},
            {
                "$group": {
                    "_id": {
                        "shift_dimension": "$_id",
                        "value": "$properties.value",
                    },
                    "shifts": {"$push": "$properties.shift"},
                    "name": {"$first": "$name"},
                }
            },
            {
                "$lookup": {
                    "from": "shift_dimensions",
                    "localField": "_id.shift_dimension",
                    "foreignField": "_id",
                    "as": "shift_dimension_data",
                }
            },
            {"$unwind": "$shift_dimension_data"},
            {
                "$project": {
                    "_id": 1,
                    "shift_dimension": "$shift_dimension_data._id",
                    "name": "$shift_dimension_data.name",
                    "value": 1,
                    "shifts": 1,
                }
            },
        ]

        # pylint: disable=no-member
        result = ShiftPropertyDocument.objects.aggregate(*pipeline)  # type: ignore
        # pylint: disable=R0801
        out = {}
        for r in result:
            print(r)
            dim_name = r["name"].lower()
            prop_value = (
                r["_id"]["value"].lower()
                if not isinstance(r["_id"]["value"], bool)
                else dim_name
                if r["_id"]["value"]
                else "not " + dim_name
            )
            prop_shifts = r["shifts"]
            if dim_name not in out:
                out[dim_name] = {}
            if prop_value not in out[dim_name]:
                out[dim_name][prop_value] = prop_shifts
            else:
                out[dim_name][prop_value] += prop_shifts
        return out

    def update_shift_property(
        self,
        shift_property: ShiftProperty,
    ) -> ShiftProperty:
        document = _to_mongo_shift_property(shift_property)
        document_saved = document.save()
        return _from_mongo_shift_property(document_saved)

    def delete_shift_properties_by_shift_id(self, shift_id: str) -> None:
        # pylint: disable=no-member
        shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
            shift=shift_id
        )
        for shift_property in shift_properties:
            shift_property.delete()

    def delete_shift_properties_by_shift_dimension_id(
        self, shift_dimension_id: str
    ) -> None:
        # pylint: disable=no-member
        shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
            shift_dimension=shift_dimension_id
        )
        for shift_property in shift_properties:
            shift_property.delete()


# Mappers
def _to_mongo_shift_property(
    dataclass_obj: ShiftProperty,
) -> ShiftPropertyDocument:
    # pylint: disable=no-member
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
        id=dataclass_obj.shift_dimension_id
    )
    return ShiftPropertyDocument(
        id=dataclass_obj.id,
        value=dataclass_obj.value,
        shift=shift,
        shift_dimension=shift_dimension,
    )


def _from_mongo_shift_property(
    doc_obj: ShiftPropertyDocument,
) -> ShiftProperty:
    return ShiftProperty(
        id=doc_obj.id,
        value=doc_obj.value,
        shift_id=doc_obj.shift.id,
        shift_dimension_id=doc_obj.shift_dimension.id,
    )
