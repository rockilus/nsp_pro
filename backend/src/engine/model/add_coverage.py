from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import ShiftDemand


# pylint: disable=too-few-public-methods
class AddCoverage(AddConstraint):
    # pylint: disable=too-many-locals
    def add_coverage(self, shift_demands: List[ShiftDemand], hard_to_soft: bool):
        penalty = get_nested_value(
            self.model_config,
            ["penalties", "coverage", "hard"],
        )
        for shift_demand in shift_demands:
            date_string = shift_demand.date.isoformat()
            shift = next(s for s in self.shifts if s.id == shift_demand.shift_id)
            if shift is None:
                continue
            # Add staffing constraints
            for staffing in shift.staffing:
                specialty_id = staffing.specialty_id
                target_staffing = staffing.staffing * shift_demand.nb_times_shift

                # No specialty required (any worker can be assigned)
                if specialty_id is None:
                    c_variables: List[cp_model.IntVar] = [
                        self.variables[
                            w,
                            date_string,
                            shift_demand.shift_id,
                        ]
                        for w in [w.id for w in self.workers if not w.deleted]
                    ]
                    if not hard_to_soft:
                        sum_var = self.model.NewIntVar(
                            target_staffing, target_staffing, ""
                        )
                        self.model.Add(sum(c_variables) == sum_var)
                        continue
                    var_name = build_var_name(shift_demand, c_variables, "coverage")
                    delta = self.model.NewIntVar(-100, 100, "")
                    self.model.Add(
                        delta == sum(c_variables) - shift_demand.nb_times_shift
                    )
                    excess = self.model.NewIntVar(-100, 100, var_name)
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(penalty)
                    continue
                # Workers qualified for this specialty
                qualified_workers = [
                    w for w in self.workers if specialty_id in w.specialty_ids
                ]
                for worker in qualified_workers:
                    self.assignment_wdss[
                        (
                            worker.id,
                            date_string,
                            shift.id,
                            specialty_id,
                        )
                    ] = self.model.NewBoolVar(
                        "assign_spe_"
                        + f"{worker.id}_{date_string}_{shift.id}_"
                        + f"{specialty_id}"
                    )
                    # Link variables
                    self.model.Add(
                        self.assignment_wdss[
                            (
                                worker.id,
                                date_string,
                                shift.id,
                                specialty_id,
                            )
                        ]
                        == self.variables[worker.id, date_string, shift.id]
                    )

                # Staffing requirement per specialty
                vars_assigned = [
                    self.assignment_wdss[(w.id, date_string, shift.id, specialty_id)]
                    for w in qualified_workers
                ]
                if not hard_to_soft:
                    self.model.Add(sum(vars_assigned) == target_staffing)
                else:
                    variable_wdss: List[cp_model.IntVar] = [
                        self.variables[w.id, date_string, shift.id]
                        for w in qualified_workers
                    ]
                    var_name = build_var_name(shift_demand, variable_wdss, "coverage")
                    delta = self.model.NewIntVar(-100, 100, "")
                    self.model.Add(delta == sum(vars_assigned) - target_staffing)
                    excess = self.model.NewIntVar(-100, 100, var_name)
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(penalty)
