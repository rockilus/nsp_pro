from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.types.input_output_types import ShiftDemand


# pylint: disable=too-few-public-methods
class AddCoverage:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers

    def add_coverage(self, coverage: List[ShiftDemand]) -> None:
        date_format = "%Y-%m-%d"
        for shift_demand in coverage:
            c_variables: List[cp_model.IntVar] = [
                self.variables[
                    w,
                    shift_demand.date.strftime(date_format),
                    shift_demand.shift_id,
                ]
                for w in self.workers
            ]
            sum_var = self.model.NewIntVar(
                shift_demand.quantity, shift_demand.quantity, ""
            )
            self.model.Add(sum_var == sum(c_variables))
