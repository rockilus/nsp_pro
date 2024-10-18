import pytest

from constraint_parser.mapping.map_constraint import MapConstaint
from constraint_parser.mapping.test_data import (
    dates_campaign,
    shift_dim_dict,
    shifts,
    worker_dim_dict,
    workers,
)


# pylint: disable=too-few-public-methods
class TestMapConstraint:
    @pytest.fixture
    def map_constraint(self):
        return MapConstaint(
            workers, worker_dim_dict, dates_campaign, shifts, shift_dim_dict
        )

    # @pytest.mark.parametrize(
    #     "test_case", test_data, ids=[str(tc['text']) for tc in test_data]
    # )
    # def test_map_constraint(self, map_constraint, test_case):
    #     constraint = map_constraint.map_constraint_sum(
    # test_case["in"], "test_schedule"
    #     )
    #     assert constraint == test_case["out"]

    # def test_map_constraint(self, map_constraint):
    #     constraint = map_constraint(test_data[0]["in"], "test_schedule")
    #     assert constraint == test_data[0]["out"]
