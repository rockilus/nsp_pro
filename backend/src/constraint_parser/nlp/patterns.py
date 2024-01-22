import re
from typing import Dict, List

from utils.constants import Constants


def build_patterns(
    shift_names: List[str],
    worker_names: List[str],
    shift_dimension_names: List[str],
    worker_dimension_names: List[str],
) -> List:
    patterns_operator = [
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "at"}, {"LOWER": "most"}],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "less"}, {"LOWER": "than"}],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [
                {"LOWER": "less"},
                {"LOWER": "than"},
                {"LOWER": "or"},
                {"LOWER": "equal"},
                {"LOWER": "to"},
            ],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "at"}, {"LOWER": "least"}],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "maximum"}],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "no"}],
        },
        {
            "label": Constants.OPERATOR_PATTERN_LABEL,
            "pattern": [{"LOWER": "evenly"}],
        },
    ]
    patterns_shift = [
        {
            "label": Constants.SHIFT_PATTERN_LABEL,
            "pattern": [{"LEMMA": {"LOWER": "day"}}, {"LOWER": "off"}],
        },
        {
            "label": Constants.SHIFT_PATTERN_LABEL,
            "pattern": [{"LOWER": {"IN": shift_names}}],
        },
        {
            "label": Constants.SHIFT_PATTERN_LABEL,
            # "pattern": [{"LOWER": {"IN": shift_dimension_names}}],
            "pattern": [{"LEMMA": {"IN": shift_dimension_names}}],
        },
    ]
    pattern_worker = build_patterns_from_list_of_strings(
        Constants.WORKER_PATTERN_LABEL, worker_names
    ) + build_patterns_from_list_of_strings(
        Constants.WORKER_PATTERN_LABEL, worker_dimension_names
    )
    patterns_timing = [
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": "consecutive"}],
        },
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": "per"}, {"LOWER": "week"}],
        },
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": "per"}, {"LOWER": "month"}],
        },
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": "after"}],
        },
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": {"IN": Constants.WEEK_DAYS}}],
        },
        {
            "label": Constants.TIMING_PATTERN_LABEL,
            "pattern": [{"LEMMA": "bank"}, {"LEMMA": "holiday"}],
        },
    ]
    return (
        patterns_operator + patterns_shift + pattern_worker + patterns_timing
    )


def build_patterns_from_list_of_strings(
    label: str, strings_list: List[str]
) -> List[Dict]:
    patterns = []
    for string in strings_list:
        string_parts = [
            part
            for s in string.split()
            for part in split_string_by_char_types(s)
        ]
        pattern = [{"LEMMA": part} for part in string_parts]
        patterns.append({"label": label, "pattern": pattern})
    return patterns


def split_string_by_char_types(s):
    parts = re.findall(r'\d+|[a-zA-Z]+|\W+', s)
    return parts
