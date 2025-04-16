from dataclasses import dataclass
from datetime import date
from enum import Enum


class ExportPeriodOptions(Enum):
    CURRENT_SELECTION = 0
    CAMPAIGN = 1
    ALL = 2
    CUSTOM = 3


@dataclass
class ExportOptions:
    period_option: ExportPeriodOptions
    start_date: date
    end_date: date
