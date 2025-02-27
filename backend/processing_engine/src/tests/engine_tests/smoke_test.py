import pytest
from shared.schemas import EngineInputsAugmented

from engine import Outputs
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
