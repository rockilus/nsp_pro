from dataclasses import dataclass
from typing import List, Union


@dataclass
class Worker:
    id: str
    name: str


@dataclass
class WorkerDimension:
    id: str
    name: str
    entry_type: str
    entry_options: List[str]


@dataclass
class WorkerProperty:
    id: str
    value: Union[str, int, float, bool]
    worker_id: str
    worker_dimension_id: str
