from typing import List

from bson import ObjectId
from database.db import DB
from models import ShiftParam


class ShiftParamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_shift_params(
        self,
    ) -> List[ShiftParam]:
        shift_param_first_name = ShiftParam(
            _id=ObjectId(),
            name="shift_name",
            label="Shift Name",
            entry_type="str",
            entry_options=[],
        )
        shift_param_first_name.save()
        # pylint: disable=no-member
        shift_params = ShiftParam.objects.all()  # type: ignore
        return shift_params

    def create_shift_param(
        self,
        name: str,
        label: str,
        entry_type: str,
        entry_options: List[str],
    ) -> List[ShiftParam]:
        # pylint: disable=R0801
        shift_param = ShiftParam(
            _id=ObjectId(),
            name=name,
            label=label,
            entry_type=entry_type,
            entry_options=entry_options,
        )
        shift_param.save()
        # pylint: disable=no-member
        shift_params = ShiftParam.objects.all()  # type: ignore
        return list(shift_params)

    def get_shift_params(
        self,
    ) -> List[ShiftParam]:
        # pylint: disable=no-member
        shift_params = ShiftParam.objects.all()  # type: ignore
        return list(shift_params)

    def get_shift_param_by_id(
        self,
        shift_param_id: str,
    ) -> ShiftParam:
        # pylint: disable=no-member
        shift_param = ShiftParam.objects.get(  # type: ignore
            _id=shift_param_id
        )
        return shift_param

    def update_shift_param(
        self,
        shift_param: ShiftParam,
        label: str,
        entry_type: str,
        entry_options: List[str],
    ) -> ShiftParam:
        shift_param.label = label
        shift_param.entry_type = entry_type
        shift_param.entry_options = entry_options
        shift_param.save()
        return shift_param

    def delete_shift_param(
        self,
        shift_param: ShiftParam,
    ) -> None:
        shift_param.delete()
