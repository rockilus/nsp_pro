import re
from datetime import UTC, date, datetime
from typing import Any

from ortools.sat.python import cp_model  # type: ignore

from engine.model.model import Model
from engine.types import Assignment, Breach, Outputs, SolverRun


class Output:
    def __init__(self, model: Model) -> None:
        self.model = model

    def build_outputs(self) -> Outputs:
        is_solution = self.model.status in (
            cp_model.OPTIMAL,
            cp_model.FEASIBLE,
        )
        solver_run = self.parse_response_stats(
            self.model.solver.ResponseStats(),
            self.model.model_config.solver_params.to_dict(),
            self.model.log_output,
        )
        if is_solution:
            assignments = self.build_solution()
            objective_value = self.model.solver.ObjectiveValue()
            breaches = self.build_constraint_breaches()
            var_sol = {
                n: 1 if self.model.solver.BooleanValue(v) else 0
                for n, v in self.model.variables.items()
            }
            var_spe_sol = {
                n: 1 if self.model.solver.BooleanValue(v) else 0
                for n, v in self.model.assignment_wdss.items()
            }
            return Outputs(
                model=self.model.model,
                is_solution=is_solution,
                assignments=assignments,
                objective_value=objective_value,  # type: ignore # [CHECK IF OK]
                breaches=breaches,
                var_sol=var_sol,
                var_spe_sol=var_spe_sol,
                status=self.model.status,
                wall_time=self.model.solver.WallTime(),
                solver_run=solver_run,
            )
        return Outputs(
            model=self.model.model,
            is_solution=is_solution,
            assignments=[],
            objective_value=0,
            breaches=[],
            var_sol={},
            var_spe_sol={},
            status=self.model.status,
            wall_time=self.model.solver.WallTime(),
            solver_run=solver_run,
        )

    def build_solution(self) -> list[Assignment]:
        assignments = []
        for variable, bool_var in self.model.variables.items():
            if self.model.solver.BooleanValue(bool_var):
                assignments.append(
                    Assignment(
                        variable[0],
                        date.fromisoformat(variable[1]),
                        variable[2],
                    )
                )

        for var_spe, bool_var_spe in self.model.assignment_wdss.items():
            var_gen = self.model.variables[(var_spe[0], var_spe[1], var_spe[2])]
            if self.model.solver.BooleanValue(
                bool_var_spe
            ) and not self.model.solver.BooleanValue(var_gen):
                print("Spe var implication failed")

        return assignments

    def build_constraint_breaches(self) -> list[Breach]:
        out = []
        # var_debug = {k: v for k, v in self.model.variables.items()}
        for var in self.model.obj.bool_vars:
            if self.model.solver.BooleanValue(var):
                if var.Name() == "":
                    continue
                out.append(
                    Breach(
                        var_name=var.Name(),
                        value_diff=self.model.solver.Value(var),
                    )
                )
        for var in self.model.obj.int_vars:
            if self.model.solver.Value(var) > 0:
                if var.Name() == "":
                    continue
                out.append(
                    Breach(
                        var_name=var.Name(),
                        value_diff=self.model.solver.Value(var),
                    )
                )
        return out

    @staticmethod
    def parse_response_stats(
        response_stats_str: str, params: dict[str, str], log_output: str
    ) -> SolverRun:
        # Regular expression pattern for extracting key-value pairs
        pattern = re.compile(r"(\w+): (.+)")

        # Dictionary to store extracted values
        extracted_values: dict[str, Any] = {}

        for match in pattern.finditer(response_stats_str):
            key = match.group(1)
            value = match.group(2).strip()

            # Convert types based on known attributes
            # pylint: disable=R0801
            if key in {
                "objective",
                "best_bound",
                "integers",
                "booleans",
                "conflicts",
                "branches",
                "propagations",
                "integer_propagations",
                "restarts",
                "lp_iterations",
            }:
                try:
                    extracted_values[key] = int(value)
                except (ValueError, TypeError):
                    pass
            elif key in {
                "walltime",
                "usertime",
                "deterministic_time",
                "gap_integral",
            }:
                try:
                    extracted_values[key] = float(value)
                except (ValueError, TypeError):
                    pass
            else:
                extracted_values[key] = value  # Keep as string for status & fingerprint

        # Create SolverRun instance
        return SolverRun(
            run_timestamp=datetime.now(UTC).timestamp(),
            status=str(extracted_values.get("status", "")),
            objective=extracted_values.get("objective", 0),
            best_bound=extracted_values.get("best_bound", 0),
            integers=extracted_values.get("integers", 0),
            booleans=extracted_values.get("booleans", 0),
            conflicts=extracted_values.get("conflicts", 0),
            branches=extracted_values.get("branches", 0),
            propagations=extracted_values.get("propagations", 0),
            integer_propagations=extracted_values.get("integer_propagations", 0),
            restarts=extracted_values.get("restarts", 0),
            lp_iterations=extracted_values.get("lp_iterations", 0),
            walltime=extracted_values.get("walltime", 0.0),
            usertime=extracted_values.get("usertime", 0.0),
            deterministic_time=extracted_values.get("deterministic_time", 0.0),
            gap_integral=extracted_values.get("gap_integral", 0.0),
            solution_fingerprint=str(extracted_values.get("solution_fingerprint", "")),
            params=params,
            log_output=log_output,
        )
