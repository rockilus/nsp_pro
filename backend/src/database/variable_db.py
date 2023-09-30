from bson import ObjectId

from database.db import DB
from models import Variable


class VariableDB:
    def __init__(self, db: DB):
        self.db = db

    def create_variable(
        self,
    ) -> Variable:
        variable = Variable(
            _id=ObjectId(),
        )
        variable_saved = variable.save()
        return variable_saved

    def get_variable(
        self,
    ) -> Variable:
        # pylint: disable=no-member
        variable = Variable.objects.first()  # type: ignore
        return variable

    def delete_variable(self, variable: Variable) -> None:
        variable.delete()
