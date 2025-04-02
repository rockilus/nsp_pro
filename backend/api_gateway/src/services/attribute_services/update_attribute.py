# pylint: disable=R0801
from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    ShiftLeaveType,
    ShiftRestType,
)

from src.scripts.setup_database import attribute_db, shift_db, worker_db


def create_or_update_attribute(attribute: Attribute) -> Attribute:
    if attribute.owner_type == AttributeOwnerType.SHIFT:
        shift = shift_db.get_shift_by_id(attribute.owner_id)
        if shift is None:
            raise ValueError("Shift does not exist")
        if shift.rest_type == ShiftRestType.OFF:
            raise ValueError("Cannot update the default rest shift")
        if shift.leave_type != ShiftLeaveType.NONE:
            raise ValueError("Cannot update a leave shift")
    elif attribute.owner_type == AttributeOwnerType.WORKER:
        worker = worker_db.get_worker_by_id(attribute.owner_id)
        if worker is None:
            raise ValueError("Worker does not exist")
    else:
        raise ValueError("Invalid owner type")
    if attribute.id == "":
        new_sp = attribute_db.create_attribute(attribute)
    else:
        new_sp = attribute_db.update_attribute(attribute)
    return new_sp
