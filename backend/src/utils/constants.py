from dataclasses import dataclass


@dataclass
class Constants:
    NUM_DAYS_WEEK: int = 7
    HARD_TO_SOFT: bool = True
    ENGINE_STRING_DATE_FORMAT: str = "%Y-%m-%d"
    ENGINE_SAVED_FILE_PATH: str = "/backend/src/engine/saved/"
    BENCHMARK_LOG_FILE_NAME: str = "benchmark_log.csv"
    MODEL_SAVED_FILE_NAME: str = "model_saved.txt"
