from dataclasses import dataclass
from datetime import date


@dataclass
class FixedAssignment:
    id: str
    worker_id: str
    date: date
    shift_id: str
