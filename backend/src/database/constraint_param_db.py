from bson import ObjectId
from database.db import DB
from models import ConstraintParam


class ConstraintParamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_constraint_params(
        self,
    ) -> ConstraintParam:
        constraint_param = ConstraintParam(
            _id=ObjectId(),
        )
        constraint_param_saved = constraint_param.save()
        return constraint_param_saved

    def get_constraint_params(
        self,
    ) -> ConstraintParam:
        # pylint: disable=no-member
        constraint_param = ConstraintParam.objects.first()  # type: ignore
        return constraint_param
