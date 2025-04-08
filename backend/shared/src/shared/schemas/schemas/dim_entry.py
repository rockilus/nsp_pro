from dataclasses import asdict, dataclass
from typing import Dict


@dataclass
# pylint: disable=R0801
class DimEntry:
    id: str
    dimension_id: str
    name: str
    deleted: bool

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "DimEntry":
        return cls(
            id=data["id"],
            dimension_id=data["dimension_id"],
            name=data["name"],
            deleted=data["deleted"],
        )
