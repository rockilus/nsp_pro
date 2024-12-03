from typing import Dict, Tuple

from engine.types import Objective
from ortools.sat.python import cp_model  # type: ignore


# pylint: disable=too-few-public-methods, too-many-instance-attributes
class AddConstraint:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        assignment_wdss: Dict[Tuple[str, str, str, str], cp_model.IntVar],
        obj: Objective,
        model_config: Dict,
    ) -> None:
        self.model = model
        self.variables = variables
        self.assignment_wdss = assignment_wdss
        self.obj = obj
        self.model_config = model_config
