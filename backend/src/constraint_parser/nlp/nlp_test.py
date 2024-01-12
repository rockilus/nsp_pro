import pytest
from constraint_parser.nlp.patterns import build_patterns
from constraint_parser.nlp.test_data import (
    shift_names,
    test_data,
    worker_names,
    test_data_single,
)
from constraint_parser.nlp.text_to_block import TextToBlock


class TestNLP:
    @pytest.fixture
    def text_to_block(self):
        patterns = build_patterns(shift_names, worker_names)
        return TextToBlock(patterns)

    @pytest.mark.parametrize("test_case", test_data)
    # @pytest.mark.parametrize("test_case", test_data_single)
    def test_text_to_block(self, text_to_block, test_case):
        blocks = text_to_block(test_case["in_text"])
        assert blocks == test_case["out_nlp"]


# def _recursive_dict_compare(dict1, dict2):
#     if not isinstance(dict1, dict) or not isinstance(dict2, dict):
#         return dict1 == dict2
#     for key in dict1:
#         if key not in dict2:
#             return False
#         if not _recursive_dict_compare(dict1[key], dict2[key]):
#             return False
#     return True
