# pylint: disable=R0801
from core import ShiftProperty
from scripts.setup_database import shift_property_db


def create_or_update_shift_property(
    shift_property: ShiftProperty,
) -> ShiftProperty:
    if shift_property.id == "":
        new_sp = shift_property_db.create_shift_property(shift_property)
    else:
        new_sp = shift_property_db.update_shift_property(shift_property)
    return new_sp
