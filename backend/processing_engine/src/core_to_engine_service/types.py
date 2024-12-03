from dataclasses import dataclass
from datetime import date
from typing import List


@dataclass
class WorkerDates:
    dates_hist: List[date]
    dates_campaign: List[date]
