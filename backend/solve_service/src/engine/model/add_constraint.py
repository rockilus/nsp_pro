from ortools.sat.python import cp_model  # type: ignore

from engine.types import Objective


# pylint: disable=too-few-public-methods, too-many-instance-attributes
class AddConstraint:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: dict[tuple[str, str, str], cp_model.IntVar],
        assignment_wdss: dict[tuple[str, str, str, str], cp_model.IntVar],
        obj: Objective,
        var_spe_sol: dict[tuple[str, str, str, str], int] | None = None,
    ) -> None:
        self.model = model
        self.variables = variables
        self.assignment_wdss = assignment_wdss
        self.obj = obj
        self.var_spe_sol = var_spe_sol
