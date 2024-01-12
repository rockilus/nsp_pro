from typing import List

from utils.constants import Constants


def build_patterns(shift_names: List[str], worker_names: List[str]) -> List:
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
    ]
    pattern_worker = [
        {
            "label": Constants.WORKER_PATTERN_LABEL,
            "pattern": [{"LOWER": {"IN": worker_names}}],
        },
    ]
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
            "pattern": [{"LEMMA": "after"}],
        },
    ]
    return (
        patterns_operator + patterns_shift + pattern_worker + patterns_timing
    )
