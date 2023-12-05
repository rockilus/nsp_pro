from dataclasses import dataclass
from typing import Tuple


@dataclass
class Constants:
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
