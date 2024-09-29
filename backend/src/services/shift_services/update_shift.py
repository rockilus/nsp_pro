from core import Shift, ShiftLeaveType, ShiftRestType
from scripts.setup_database import shift_db


def update_shift(new_shift: Shift) -> Shift:
    shift = shift_db.get_shift_by_id(new_shift.id)
    if shift is None:
        raise ValueError("Shift does not exist")
    if shift.rest_type == ShiftRestType.OFF:
        raise ValueError("Cannot update the default rest shift")
    if shift.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot update a leave shift")
    return shift_db.update_shift(new_shift)
