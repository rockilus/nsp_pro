from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List


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

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["owner_type"] = self.owner_type.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Attribute":
        return cls(
            id=data["id"],
            value=data["value"],
            owner_type=AttributeOwnerType(data["owner_type"]),
            owner_id=data["owner_id"],
            dimension_id=data["dimension_id"],
            dim_entry_ids=data["dim_entry_ids"],
        )
