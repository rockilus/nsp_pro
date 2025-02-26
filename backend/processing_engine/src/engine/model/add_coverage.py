from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name_daily_shift_demand
from engine.types import ObjectiveCategory, ShiftDemand


# pylint: disable=too-few-public-methods
class AddCoverage(AddConstraint):
    # pylint: disable=too-many-locals
    def add_coverage(self, shift_demands: List[ShiftDemand], hard_to_soft: bool):
        for shift_demand in shift_demands:
            if shift_demand.assignments:
                c_variables: List[cp_model.IntVar] = [
                    self.variables[a] for a in shift_demand.assignments
                ]
                if not hard_to_soft:
                    self.model.Add(sum(c_variables) == shift_demand.target)
                else:
                    var_name = build_var_name_daily_shift_demand(
                        c_variables, ObjectiveCategory.DAILY_SHIFT_DEMAND
                    )
                    delta = self.model.NewIntVar(-100, 100, "")
                    self.model.Add(delta == sum(c_variables) - shift_demand.target)
                    excess = self.model.NewIntVar(-100, 100, var_name)
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(shift_demand.penalty)

            for assignments_specialty, target_specialty in zip(
                shift_demand.assignments_specialties,
                shift_demand.target_specialties,
            ):
                c_variables_gen: List[cp_model.IntVar] = []
                c_variables_spe: List[cp_model.IntVar] = []
                for a_specialty in assignments_specialty:
                    # Create specialty variables
                    if a_specialty not in self.assignment_wdss:
                        self.assignment_wdss[a_specialty] = self.model.NewBoolVar(
                            "assign_spe_"
                            + f"{a_specialty[0]}_{a_specialty[1]}_{a_specialty[2]}_"
                            + f"{a_specialty[3]}"
                        )
                    c_variables_gen.append(
                        self.variables[
                            a_specialty[0],
                            a_specialty[1],
                            a_specialty[2],
                        ]
                    )
                    c_variables_spe.append(self.assignment_wdss[a_specialty])

                # Link variables
                for var, var_spe in zip(c_variables_gen, c_variables_spe):
                    self.model.AddImplication(var_spe, var)

                # Staffing requirement per specialty
                if not hard_to_soft:
                    self.model.Add(sum(c_variables_spe) == target_specialty)
                else:
                    var_name = build_var_name_daily_shift_demand(
                        c_variables_gen,
                        ObjectiveCategory.DAILY_SHIFT_DEMAND_SPE,
                    )
                    delta = self.model.NewIntVar(-100, 100, "")
                    self.model.Add(delta == sum(c_variables_spe) - target_specialty)
                    excess = self.model.NewIntVar(-100, 100, var_name)
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(shift_demand.penalty)
        self.add_worker_shift_constraints()

    def add_worker_shift_constraints(self) -> None:
        # Group variables by (worker_id, iso_date, shift_id)
        grouped_vars: Dict[Tuple[str, str, str], List[cp_model.IntVar]] = {}
        for (
            worker_id,
            iso_date,
            shift_id,
            _,
        ), var in self.assignment_wdss.items():
            key = (worker_id, iso_date, shift_id)
            if key not in grouped_vars:
                grouped_vars[key] = []
            grouped_vars[key].append(var)

        # Add constraints for each group
        for key, vars_group in grouped_vars.items():
            if len(vars_group) > 1:
                self.model.Add(sum(vars_group) <= 1)
                print(f"Added constraint: sum({vars_group}) <= 1 for {key}")
