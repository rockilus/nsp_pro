from typing import List, Union

from bson import ObjectId
from database.db import DB
from models import Shift, ShiftParam, ShiftProperty


class ShiftPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_property(
        self,
        shift: Shift,
        shift_param: ShiftParam,
        value: Union[str, int, float, bool],
    ) -> ShiftProperty:
        shift_property = ShiftProperty(
            _id=ObjectId(),
            value=value,
            shift=shift,
            shift_param=shift_param,
        )
        shift_property_saved = shift_property.save()
        return shift_property_saved

    def get_shift_properties_by_shift(
        self,
        shift: Shift,
    ) -> List[ShiftProperty]:
        # pylint: disable=no-member
        shift_properties = ShiftProperty.objects.filter(shift=shift)  # type: ignore
        return list(shift_properties)

    def get_shift_properties_by_shift_param(
        self,
        shift_param: ShiftParam,
    ) -> List[ShiftProperty]:
        # pylint: disable=no-member
        shift_properties = ShiftProperty.objects.filter(  # type: ignore
            shift_param=shift_param
        )
        return list(shift_properties)

    def get_shift_property_by_id(self, shift_property_id: str) -> ShiftProperty:
        # pylint: disable=no-member
        print("shift_id in get_shift_by_id:", shift_property_id)
        shift_property = ShiftProperty.objects.get(  # type: ignore
            _id=shift_property_id
        )
        return shift_property

    def get_shift_property_by_shift_and_param(
        self,
        shift: Shift,
        shift_param: ShiftParam,
    ) -> ShiftProperty:
        # pylint: disable=no-member
        shift_property = (
            ShiftProperty.objects.filter(shift=shift)  # type: ignore
            .filter(shift_param=shift_param)
            .first()
        )
        return shift_property

    def update_shift_property(
        self,
        shift_property: ShiftProperty,
        value: Union[str, int, float, bool],
    ) -> ShiftProperty:
        shift_property.value = value
        shift_property_saved = shift_property.save()
        return shift_property_saved

    def delete_shift_properties(self, shift_properties: List[ShiftProperty]) -> None:
        for shift_property in shift_properties:
            shift_property.delete()
