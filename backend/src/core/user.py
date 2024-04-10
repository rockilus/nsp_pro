from dataclasses import dataclass
from typing import List


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    workers: List[str]
