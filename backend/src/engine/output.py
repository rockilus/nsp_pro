from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import (
    Assignment,
    ConstraintBreaches,
    MetaData,
    Outputs,
    Solution,
)
from engine.model import Model


class Output:
    def __init__(self, model: Model) -> None:
        self.model = model

    def build_outputs(self) -> Outputs:
        solution = self.build_solution()
        constraint_breaches = self.build_constraint_breaches()
        meta_data = self.build_meta_data()
        return Outputs(solution, constraint_breaches, meta_data)

    def build_solution(self) -> Solution:
        assignments = []
        if self.model.status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for variable, bool_var in self.model.variables.items():
                if self.model.solver.BooleanValue(bool_var):
                    assignments.append(
                        Assignment(variable[0], variable[1], variable[2])
                    )
            return Solution(
                solution_exist=True,
                solution=assignments,
            )
        return Solution(
            solution_exist=False,
            solution=[],
        )

    def build_constraint_breaches(self) -> ConstraintBreaches:
        return ConstraintBreaches([])

    def build_meta_data(self) -> MetaData:
        return MetaData(
            status=self.model.solver.StatusName(self.model.status),
            status_code=self.model.status,
            conflicts=self.model.solver.NumConflicts(),
            branches=self.model.solver.NumBranches(),
            wall_time=self.model.solver.WallTime(),
            objective_value=self.model.solver.ObjectiveValue(),
            solution_path=[],
        )


# @dataclass
# class MetaData:
#     status: Literal[
#         "UNKNOWN", "MODEL_INVALID", "FEASIBLE", "INFEASIBLE", "OPTIMAL"
#     ]
#     status_code: int
#     conflicts: int
#     branches: int
#     wall_time: float
#     objective_value: float
#     solution_path: List[InterSolution]


# @dataclass
# class ConstraintBreaches:
#     constraint_breaches: List[ConstraintBreach]


# @dataclass
# class InterSolution:
#     index: int
#     time: float
#     objective_value: float

# def print_solution(self) -> None:
#     shifts = ["O", "M", "A", "N"]

#     if self.status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
#         print()
#         header = "          "
#         # for w in range(num_weeks):
#         for _ in range(2):
#             header += "M T W T F S S "
#         print(header)
#         # for e in range(num_employees):
#         for e in range(8):
#             schedule = ""
#             # for d in range(num_days):
#             for d in range(14):
#                 # for s in range(num_shifts):
#                 for s in range(4):
#                     if self.solver.BooleanValue(self.work[e, d, s]):
#                         schedule += shifts[s] + " "
#             print(f"worker {e}: {schedule}")
#         print()
#         print("Penalties:")
#         for i, var in enumerate(self.obj_bool_vars):
#             if self.solver.BooleanValue(var):
#                 penalty = self.obj_bool_coeffs[i]
#                 if penalty > 0:
#                     print(f"  {var.Name()} violated, penalty={penalty}")
#                 else:
#                     print(f"  {var.Name()} fulfilled, gain={-penalty}")

#         for i, var in enumerate(self.obj_int_vars):
#             if self.solver.Value(var) > 0:
#                 print(
#                     # pylint: disable=line-too-long
#                     f"  {var.Name()} violated by {self.solver.Value(var)}, linear penalty={self.obj_int_coeffs[i]}"  # noqa: E501
#                 )

#     print()
#     print("Statistics")
#     print(f"  - status          : {self.solver.StatusName(self.status)}")
#     print(f"  - conflicts       : {self.solver.NumConflicts()}")
#     print(f"  - branches        : {self.solver.NumBranches()}")
#     print(f"  - wall time       : {self.solver.WallTime()} s")
#     print(f"  - objective value : {self.solver.ObjectiveValue()}")


# @dataclass
# class Assignment:
#     worker_id: str
#     date: str
#     shift_id: str


# @dataclass
# class Solution:
#     solution_exist: bool
#     solution: List[Assignment]


# @dataclass
# class ConstraintBreach:
#     constraint_id: str
#     workers: List[str]
#     dates: List[str]
#     shifts: List[str]
#     value: int
#     penalty: int


# @dataclass
# class ConstraintBreaches:
#     constraint_breaches: List[ConstraintBreach]


# @dataclass
# class InterSolution:
#     index: int
#     time: float
#     objective_value: float


# @dataclass
# class MetaData:
#     status: Literal[
#         "UNKNOWN", "MODEL_INVALID", "FEASIBLE", "INFEASIBLE", "OPTIMAL"
#     ]
#     status_code: int
#     conflicts: int
#     branches: int
#     wall_time: float
#     objective_value: float
#     solution_path: List[InterSolution]


# @dataclass
# class Outputs:
#     solution: Solution
#     constraint_breaches: ConstraintBreaches
#     meta_data: MetaData
