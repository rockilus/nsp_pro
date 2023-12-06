from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.types.input_output_types import ShiftDemand
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddCoverage(AddConstraint):
    def add_coverage(self, coverage: List[ShiftDemand]) -> None:
        for shift_demand in coverage:
            date_string = shift_demand.date.strftime(
                Constants.ENGINE_STRING_DATE_FORMAT
            )
            # Coverage
            c_variables: List[cp_model.IntVar] = [
                self.variables[
                    w,
                    date_string,
                    shift_demand.shift_id,
                ]
                for w in self.workers
            ]
            sum_var = self.model.NewIntVar(
                shift_demand.staffing, shift_demand.staffing, ""
            )
            self.model.Add(sum_var == sum(c_variables))
