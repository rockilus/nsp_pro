import pytest

from constraint_parser.mapping.map_constraint import MapConstaint
from constraint_parser.mapping.test_data import (
    shift_dimensions,
    shifts,
    test_data,
    worker_dimensions,
    workers,
)


class TestMapConstraint:
    @pytest.fixture
    def map_constraint(self):
        return MapConstaint(workers, shifts, worker_dimensions, shift_dimensions)

    @pytest.mark.parametrize(
        "test_case", test_data, ids=[str(tc['text']) for tc in test_data]
    )
    def test_map_constraint(self, map_constraint, test_case):
        constraint = map_constraint(test_case["in"])
        assert constraint == test_case["out"]
