import pytest

from constraint_parser.mapping.map_constraint import MapConstaint
from constraint_parser.mapping.test_data import (
    shift_dim_dict,
    shifts,
    test_data,
    worker_dim_dict,
    workers,
)


class TestMapConstraint:
    @pytest.fixture
    def map_constraint(self):
        return MapConstaint(workers, shifts, worker_dim_dict, shift_dim_dict)

    @pytest.mark.parametrize(
        "test_case", test_data, ids=[str(tc['text']) for tc in test_data]
    )
    def test_map_constraint(self, map_constraint, test_case):
        constraint = map_constraint(test_case["in"], "test_schedule")
        assert constraint == test_case["out"]
