from typing import Callable, Tuple

import pytest
from shared.schemas.core import EngineInputsAugmented

from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from tests.engine_tests.engine_solve import engine_solve_engine_inputs

# pylint: disable=unused-import
from tests.sample_data import sample_data_benoit_case_fixture  # noqa: F401


# pylint: disable=redefined-outer-name
def test_engine_solve_smoke(
    sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
) -> None:
    try:
        outputs: Outputs = engine_solve_engine_inputs(sample_data_benoit_case_fixture)
        assert outputs is not None
    except Exception as e:
        pytest.fail(f"engine_solve raised an exception: {e}")


# pylint: disable=redefined-outer-name
def test_engine_solve_smoke_benoit_case_250301(
    sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
    run_core_to_engine_inputs: Callable[
        [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
    ],
    run_engine_solve: Callable[[InputsEngine], Outputs],
) -> None:
    inputs, _ = run_core_to_engine_inputs(sample_data_benoit_case_fixture)

    inputs.model_config.solver_params.max_time_in_seconds = 30
    inputs.model_config.solver_params.log_search_progress = True

    out = run_engine_solve(inputs)

    assert out is not None
