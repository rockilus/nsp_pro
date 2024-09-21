from dataclasses import dataclass
from datetime import date


@dataclass
class Request:
    id: str
    worker_id: str
    start_date: date
    end_date: date
    shift_id: str
    hard: bool
    status: str


@dataclass
class RequestAugmented:
    id: str
    worker_id: str
    start_date: date
    end_date: date
    shift_id: str
    hard: bool
    status: str
    active: bool
