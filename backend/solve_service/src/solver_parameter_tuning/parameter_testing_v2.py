import copy
import json
import os
import random
import time
from dataclasses import asdict
from typing import Dict, List, Type

from shared.schemas.core import SolverParams

from engine import Engine
from engine import Inputs as InputsEngine
from engine import SolverRun


class SolverParameterTester:
    def __init__(
        self,
        inputs: InputsEngine,
        engine_cls: Type[Engine],
        dir_path_output: str = "solver_parameter_tuning/parameter_test_output",
        num_runs: int = 1,
    ):
        self.inputs = inputs
        self.engine_cls = engine_cls
        self.dir_path_output = dir_path_output
        self.num_runs = num_runs
        os.makedirs(self.dir_path_output, exist_ok=True)

    def run_solver_with_params(
        self, params: SolverParams, test_name: str, iter_num: int
    ) -> SolverRun:
        print(f"Running test: {test_name} {iter_num + 1}/{self.num_runs}")
        new_inputs = copy.deepcopy(self.inputs)
        new_inputs.model_config.solver_params = params
        engine = self.engine_cls()
        outputs = engine.solve(new_inputs)
        return outputs.solver_run

    def save_run_results(self, run: SolverRun, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(asdict(run), f, indent=2)

    # pylint: disable=too-many-locals
    def test_solver_parameters(
        self,
        parameter_tests: Dict[str, List] | None = None,
        solver_params_list: List[SolverParams] | None = None,
        run_base_case: bool = True,
        run_default_case: bool = True,
    ) -> Dict[str, SolverRun]:
        results = {}
        base_params = self.inputs.model_config.solver_params
        default_params = SolverParams(
            # fmt: off
            max_time_in_seconds=self.inputs.model_config.solver_params.max_time_in_seconds,
            num_search_workers=self.inputs.model_config.solver_params.num_search_workers,
            log_search_progress=self.inputs.model_config.solver_params.log_search_progress,
            log_subsolver_statistics=self.inputs.model_config.solver_params.log_subsolver_statistics,
            # fmt: on
            random_seed=self.inputs.model_config.solver_params.random_seed,
        )
        test_cases = []

        if run_base_case:
            test_cases.append(("base_case", base_params))

        if run_default_case:
            test_cases.append(("default_case", default_params))

        if parameter_tests:
            for param_name, param_values in parameter_tests.items():
                for value in param_values:
                    if getattr(base_params, param_name) != value:
                        test_params = SolverParams(**asdict(base_params))
                        setattr(test_params, param_name, value)
                        test_name = (
                            f"{param_name}_{value if value is not None else 'None'}"
                        )
                        if param_name in [
                            "subsolvers",
                            "ignore_subsolvers",
                            "restart_algorithms",
                        ]:
                            test_name = (
                                f"{param_name}_{'_'.join(value)}"
                                if value is not None
                                else f"{param_name}_None"
                            )
                            test_name = test_name[:100]
                        test_cases.append((test_name, test_params))

        if solver_params_list:
            for i, params in enumerate(solver_params_list):
                test_cases.append((f"custom_params_{i}", params))

        test_run_counts = {test_name: self.num_runs for test_name, _ in test_cases}

        while any(count > 0 for count in test_run_counts.values()):
            test_name, test_params = random.choice(
                [tc for tc in test_cases if test_run_counts[tc[0]] > 0]
            )
            iter_num = self.num_runs - test_run_counts[test_name]
            run_result = self.run_solver_with_params(test_params, test_name, iter_num)
            results[test_name] = run_result
            self.save_run_results(
                run_result,
                os.path.join(
                    self.dir_path_output,
                    f"{test_name}_{run_result.run_timestamp}.json",
                ),
            )
            test_run_counts[test_name] -= 1

        return results


# pylint: disable=too-many-arguments
def run_parameter_tests(
    inputs: InputsEngine,
    engine_cls: Type[Engine],
    dir_path_output: str,
    num_runs: int = 1,
    run_base_case: bool = True,
    run_default_case: bool = True,
    parameter_tests: Dict[str, List] | None = None,
    solver_params_list: List[SolverParams] | None = None,
) -> None:
    start_time = time.time()
    tester = SolverParameterTester(inputs, engine_cls, dir_path_output, num_runs)
    tester.test_solver_parameters(
        parameter_tests, solver_params_list, run_base_case, run_default_case
    )
    print(f"Parameter tests completed in {time.time() - start_time:.2f} seconds.")
