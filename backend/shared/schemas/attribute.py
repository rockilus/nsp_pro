from dataclasses import dataclass
from enum import Enum
from typing import List


class AttributeOwnerType(Enum):
    SHIFT = 0
    WORKER = 1


@dataclass
class Attribute:
    id: str
    value: str | int | float | bool
    owner_type: AttributeOwnerType
    owner_id: str
    dimension_id: str
    dim_entry_ids: List[str]
