from dataclasses import dataclass
from typing import List

from utils.constants import Constants


@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    deleted: bool


@dataclass
class WorkerDimension:
    id: str
    team_id: str
    name: str
    entry_type: Constants.DIMENSION_ENTRY_TYPES
    entry_options: List[str]


@dataclass
class WorkerProperty:
    id: str
    value: str | int | float | bool | List[str]
    worker_id: str
    worker_dimension_id: str
