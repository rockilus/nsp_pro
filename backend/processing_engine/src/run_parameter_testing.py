import os

from core_to_engine_service import core_to_engine_inputs
from engine import Engine
from solve_service.model_config import model_config
from solve_service.penalties import penalties
from solver_parameter_tuning.parameter_testing import run_parameter_tests

if __name__ == "__main__":
    current_folder = os.path.dirname(__file__)
    file_path_test_data = os.path.join(
        current_folder,
        "tests/test_data/250301_benoit_case.json",
    )

    engine = Engine()
    run_parameter_tests(
        core_to_engine_inputs,
        engine,
        penalties,
        model_config,
        file_path_test_data,
    )
