# pylint: disable=R0801
from core import ShiftLeaveType, ShiftProperty
from scripts.setup_database import shift_db, shift_property_db


def create_or_update_shift_property(
    shift_property: ShiftProperty,
) -> ShiftProperty:
    shift = shift_db.get_shift_by_id(shift_property.shift_id)
    if shift is None:
        raise ValueError("Shift does not exist")
    if shift.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot update a leave shift")
    if shift_property.id == "":
        new_sp = shift_property_db.create_shift_property(shift_property)
    else:
        new_sp = shift_property_db.update_shift_property(shift_property)
    return new_sp
