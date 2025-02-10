from typing import Dict, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint_fai import AddConstraintFai
from engine.model.add_constraint_fil import AddConstraintFil
from engine.model.add_constraint_ord import AddConstraintOrd
from engine.model.add_constraint_seq import AddConstraintSeq
from engine.model.add_constraint_sum import AddConstraintSum
from engine.model.add_coverage import AddCoverage
from engine.model.add_request import AddRequest
from engine.types import Objective


# pylint: disable=too-few-public-methods
class AddConstraintFactory:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        assignment_wdss: Dict[Tuple[str, str, str, str], cp_model.IntVar],
        obj: Objective,
    ):
        self.add_constraint_sum = AddConstraintSum(
            model, variables, assignment_wdss, obj
        )
        self.add_constraint_seq = AddConstraintSeq(
            model, variables, assignment_wdss, obj
        )
        self.add_constraint_ord = AddConstraintOrd(
            model, variables, assignment_wdss, obj
        )
        self.add_constraint_fil = AddConstraintFil(
            model, variables, assignment_wdss, obj
        )
        self.add_constraint_fai = AddConstraintFai(
            model, variables, assignment_wdss, obj
        )
        self.add_coverage = AddCoverage(model, variables, assignment_wdss, obj)
        self.add_request = AddRequest(model, variables, obj)
