from dataclasses import dataclass
from datetime import date
from enum import Enum


class RequestStatus(Enum):
    PENDING = 0
    APPROVED = 1
    REJECTED = 2
    DISABLED = 3


@dataclass
class Request:
    id: str
    team_id: str
    worker_id: str
    start_date: date
    end_date: date
    shift_id: str
    negative: bool
    hard: bool
    status: RequestStatus


@dataclass
class RequestAugmented(Request):
    active: bool
