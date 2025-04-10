# pylint: disable=R0801
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    ShiftLeaveType,
    ShiftRestType,
)

from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods
class AttributeService(BaseService):
    def create_or_update_attribute(self, attribute: Attribute) -> Attribute:
        if attribute.owner_type == AttributeOwnerType.SHIFT:
            shift = self.collection.shift_db.get_shift_by_id(attribute.owner_id)
            if shift is None:
                raise ValueError("Shift does not exist")
            if shift.rest_type == ShiftRestType.OFF:
                raise ValueError("Cannot update the default rest shift")
            if shift.leave_type != ShiftLeaveType.NONE:
                raise ValueError("Cannot update a leave shift")
        elif attribute.owner_type == AttributeOwnerType.WORKER:
            worker = self.collection.worker_db.get_worker_by_id(attribute.owner_id)
            if worker is None:
                raise ValueError("Worker does not exist")
        else:
            raise ValueError("Invalid owner type")
        if attribute.id == "":
            new_sp = self.collection.attribute_db.create_attribute(attribute)
        else:
            new_sp = self.collection.attribute_db.update_attribute(attribute)
        return new_sp
