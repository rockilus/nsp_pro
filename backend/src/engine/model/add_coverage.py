from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import ShiftDemand
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddCoverage(AddConstraint):
    def add_coverage(self, coverage: List[ShiftDemand], hard_to_soft: bool) -> None:
        for shift_demand in coverage:
            # if shift_demand.date == date(2024, 10, 27):
            #     print("Shift demand: ", shift_demand)
            #     continue
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
                for w in shift_demand.worker_ids
            ]
            if not hard_to_soft:
                sum_var = self.model.NewIntVar(
                    shift_demand.staffing, shift_demand.staffing, ""
                )
                self.model.Add(sum_var == sum(c_variables))
            else:
                penalty = get_nested_value(
                    self.model_config,
                    ["penalties", "coverage", "hard"],
                )
                var_name = build_var_name(shift_demand, c_variables, "coverage")
                delta = self.model.NewIntVar(-100, 100, "")
                self.model.Add(delta == sum(c_variables) - shift_demand.staffing)
                excess = self.model.NewIntVar(-100, 100, var_name)
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)


# from ortools.sat.python import cp_model
# from typing import List, Dict

# def add_staffing_constraints(
#         model: cp_model.CpModel, shifts: List[Shift], workers: List[Worker]
#         ):
#     # Variables indicating if a worker is assigned to a shift
#     assigned_ws: Dict[Tuple[str, str], cp_model.BoolVar] = {}

#     # Variables indicating if a worker is assigned to a shift for a specialty
#     assigned_wsr: Dict[Tuple[str, str, str], cp_model.BoolVar] = {}

#     # Create assignment variables
#     for shift in shifts:
#         for worker in workers:
#             assigned_ws[(worker.id, shift.id)] = model.NewBoolVar(
#                 f'assigned_{worker.id}_{shift.id}'
#                 )

#     # Add staffing constraints
#     for shift in shifts:
#         specialties = [s.staffing for s in shift.staffing]
#         for staffing_req in shift.staffing:
#             specialty_id = staffing_req.specialty_id
#             required_staffing = staffing_req.staffing

#             # Workers qualified for this specialty
#             qualified_workers = [
#                 w for w in workers if specialty_id in w.specialty_ids
#                 ]
#             for worker in qualified_workers:
#                 var_name = f'assigned_{worker.id}_{shift.id}_{specialty_id}'
#                 assigned_wsr[
#                     (worker.id, shift.id, specialty_id)
#                     ] = model.NewBoolVar(var_name)
#                 # Link variables
#                 model.Add(
#                     assigned_wsr[
#                         (worker.id, shift.id, specialty_id)
#                         ] <= assigned_ws[(worker.id, shift.id)])

#             # Staffing requirement per specialty
#             vars_assigned = [
#                 assigned_wsr[
#                     (w.id, shift.id, specialty_id)
#                     ] for w in qualified_workers]
#             model.Add(sum(vars_assigned) == required_staffing)

#         # Each worker assigned to at most one specialty per shift
#         for worker in workers:
#             vars_specialties = [
#                 assigned_wsr[(worker.id, shift.id, s.specialty_id)]
#                 for s in shift.staffing
#                 if (worker.id, shift.id, s.specialty_id) in assigned_wsr
#             ]
#             if vars_specialties:
#                 model.Add(
#                     sum(vars_specialties) == assigned_ws[(worker.id, shift.id)])
#             else:
#                 model.Add(assigned_ws[(worker.id, shift.id)] == 0)

#     return assigned_ws, assigned_wsr
