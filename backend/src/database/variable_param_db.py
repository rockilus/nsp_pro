from typing import List

from bson import ObjectId

from database.db import DB
from models import Variable, VariableParam


class VariableParamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_variable_param(
        self,
        name: str,
        index: int,
        value_options: List[str],
        variable: Variable,
    ) -> VariableParam:
        variable_param = VariableParam(
            _id=ObjectId(),
            name=name,
            index=index,
            value_options=value_options,
            variable=variable,
        )
        variable_param_saved = variable_param.save()
        return variable_param_saved

    def get_variable_params(
        self,
    ) -> List[VariableParam]:
        # pylint: disable=no-member
        variable_params = VariableParam.objects.all()  # type: ignore
        return list(variable_params)

    def get_variable_param_by_id(
        self,
        variable_param_id: str,
    ) -> VariableParam:
        # pylint: disable=no-member
        variable_param = VariableParam.objects.get(  # type: ignore
            _id=variable_param_id
        )
        return variable_param

    def get_variable_params_by_variable(
        self,
        variable: Variable,
    ) -> List[VariableParam]:
        # pylint: disable=no-member
        variable_params = VariableParam.objects.filter(  # type: ignore
            variable=variable
        )
        return list(variable_params)

    def get_variable_param_by_variable_and_name(
        self,
        variable: Variable,
        name: str,
    ) -> List[VariableParam]:
        # pylint: disable=no-member
        variable_params = (
            VariableParam.objects.filter(variable=variable)  # type: ignore
            .filter(name=name)
            .first()
        )
        return variable_params

    def update_variable_param(
        self,
        name: str,
        index: int,
        value_options: List[str],
        variable_param: VariableParam,
    ) -> VariableParam:
        variable_param.name = name
        variable_param.index = index
        variable_param.value_options = value_options
        variable_param_saved = variable_param.save()
        return variable_param_saved

    def delete_variable_param(
        self,
        variable_param: VariableParam,
    ) -> None:
        variable_param.delete()
