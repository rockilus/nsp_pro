from dataclasses import dataclass
from typing import Literal, Tuple


@dataclass
# pylint: disable=too-many-instance-attributes
class Constants:
    # Config
    HOST: str = "127.0.0.1"
    BASE_URL: str = "http://" + HOST
    WEBSITE_PORT: int = 3000
    API_PORT: int = 5000
    # SuperTokens config
    ST_CONNECTION_URI: str = (
        "https://st-dev-707a9b40-cfce-11ee-b31a-575ea1b90de8.aws.supertokens.io"
    )
    ST_API_KEY: str = "IM3-DkK88nDEVgyEI7Vpx8Yzgo"
    ST_DASHBOARD_ADMINS: Tuple[str, ...] = ("felipe.kharaba@icloud.com",)
    # Permit.io config
    PDP_URL: str = "http://localhost:7766"
    PERMIT_API_KEY: str = (
        "permit_key_DdSCEb3OXhfpVpjx1iHEnHfQ9mp3ReRk1B3g0htSS"
        + "rSmQ6GvvKfLhHhWncxvxBqi2wNfhDhM9eZsIZfurOmaB4"
    )

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
    # Authentication
    # move out for production
    # to get a string like this run: openssl rand -hex 32
    SECRET_KEY: str = "485987f47ca94097327988d802aa07fc6df623f3345e52df85b5c7fd395897f6"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
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
        "no",
    ]
    CONSTRAINT_TYPE_OPTIONS = Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    VAR_WORKER_SELECTOR_OPTIONS = Literal["all", "equal"]
    VAR_DAY_SELECTOR_OPTIONS = Literal["all", "week", "period", "week_day_index"]
    VAR_SHIFT_SELECTOR_OPTIONS = Literal["all", "equal"]
