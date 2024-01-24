import pytest

from constraint_parser.mapping.constraint_mapping import ConstraintMapping
from constraint_parser.mapping.test_data import (
    shift_dimensions,
    shifts,
    test_data,
    worker_dimensions,
    workers,
)


class TestConstraintMapping:
    @pytest.fixture
    def constraint_mapping(self):
        return ConstraintMapping(
            workers,
            shifts,
            worker_dimensions,
            shift_dimensions,
        )

    @pytest.mark.parametrize("test_case", test_data)
    def test_constraint_mapping(self, constraint_mapping, test_case):
        constraint = constraint_mapping(test_case["in"])
        assert constraint == test_case["out"]


# def _recursive_dict_compare(dict1, dict2):
#     if not isinstance(dict1, dict) or not isinstance(dict2, dict):
#         return dict1 == dict2
#     for key in dict1:
#         if key not in dict2:
#             return False
#         if not _recursive_dict_compare(dict1[key], dict2[key]):
#             return False
#     return True
