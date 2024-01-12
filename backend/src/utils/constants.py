from dataclasses import dataclass
from typing import Tuple


@dataclass
# pylint: disable=too-many-instance-attributes
class Constants:
    NUM_SECONDS_MINUTE: int = 60
    NUM_MINUTES_HOUR: int = 60
    NUM_HOURS_DAY: int = 24
    NUM_DAYS_WEEK: int = 7
    WEEK_DAYS: Tuple[str, ...] = (
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    )
    HARD_TO_SOFT: bool = True
    ENGINE_STRING_DATE_FORMAT: str = "%Y-%m-%d"
    ENGINE_SAVED_FILE_PATH: str = "/backend/src/engine/saved/"
    BENCHMARK_LOG_FILE_NAME: str = "benchmark_log.csv"
    MODEL_SAVED_FILE_NAME: str = "model_saved.txt"
    # move out for production
    # to get a string like this run: openssl rand -hex 32
    SECRET_KEY: str = (
        "485987f47ca94097327988d802aa07fc6df623f3345e52df85b5c7fd395897f6"
    )
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
