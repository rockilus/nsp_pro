from dataclasses import dataclass
from typing import List, Literal, Tuple


@dataclass
# pylint: disable=too-many-instance-attributes
class Constants:
    # General
    NUM_SECONDS_MINUTE: int = 60
    NUM_MINUTES_HOUR: int = 60
    NUM_HOURS_DAY: int = 24
    NUM_DAYS_WEEK: int = 7
    WEEK_DAYS: Tuple[str, ...] = (
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    )

    # Workers and Shifts
    DIMENSION_ENTRY_TYPES = Literal["str", "int", "bool", "list"]

    # Engine
    HARD_TO_SOFT: bool = True
    ENGINE_STRING_DATE_FORMAT: str = "%Y-%m-%d"
    ENGINE_SAVED_FILE_PATH: str = "/backend/src/engine/saved/"
    BENCHMARK_LOG_FILE_NAME: str = "benchmark_log.csv"
    MODEL_SAVED_FILE_NAME: str = "model_saved.txt"

    # Constraint Parser
    SHIFT_PATTERN_LABEL: str = "SHIFT"
    WORKER_PATTERN_LABEL: str = "WORKER"
    VAR_COORD_PATTERN_LABEL: Tuple[str, ...] = (
        SHIFT_PATTERN_LABEL,
        WORKER_PATTERN_LABEL,
    )
    OPERATOR_PATTERN_LABEL: str = "OPERATOR"
    TIMING_PATTERN_LABEL: str = "TIMING"
    NAME_BLOCK_LABEL: str = "name"
    QUANTITY_BLOCK_LABEL: str = "quantity"
    REFERENCE_BLOCK_LABEL: str = "reference"
    CONNECTOR_BLOCK_LABEL: str = "connector"
    BLOCK_NAME_OPTIONS = Literal[
        "operator",
        "#",
        "timing",
        "shift",
        "worker",
        "text",
        "shift_reference",
        "shift_relative",
        "weekday",
    ]
    CONSTRAINT_OPERATOR_OPTIONS = Literal[
        "",
        "less_than",
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
        "greater_than",
        "yes",
        "yes_exclusively",
        "no",
    ]
    CONSTRAINT_TYPE_OPTIONS = Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    VAR_WORKER_SELECTOR_OPTIONS = Literal["all", "equal"]
    VAR_DAY_SELECTOR_OPTIONS = Literal["all", "week", "period", "week_day_index"]
    VAR_SHIFT_SELECTOR_OPTIONS = Literal["all", "equal"]
    BLOCK_TYPE_OPTIONS = Literal["string", "number", "list", "shift_worker_option"]
    SHIFT_WORKER_OPTION_ID_TYPES_OPTIONS = Literal["shift", "worker", "dimension", ""]

    # Stats
    STATS_TIME_FRAME_OPTIONS = Literal[
        "last_12_months", "last_24_months", "last_36_months", "custom"
    ]
    STATS_UNIT_OPTIONS = Literal[
        "nb_days_worked",
        "time_worked",
        "nb_shifts_worked",
        "nb_rest_days",
        "nb_rest_shifts",
        "nb_times_shift",
        "nb_times_rest",
    ]
    HEADER_UNIT_OPTIONS = Literal["weekday", "week", "month", "year", "all", "shift"]

    # Routes
    USER_ERROR_MESSAGE_GENERIC: str = (
        "an error occurred while processing your request, please try again later."
    )


# User
SUPPORTED_LANGUAGES_LIST: List[str] = ["en", "es", "fr"]
SUPPORTED_LANGUAGES_LITERAL = Literal["en", "es", "fr"]
