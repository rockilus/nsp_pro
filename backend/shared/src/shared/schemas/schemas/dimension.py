from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List


class DimensionType(Enum):
    WORKER = 0
    SHIFT = 1
    REST_SHIFT = 2


class DimensionEntryType(Enum):
    STR = 0
    INT = 1
    BOOL = 2
    DIM_ENTRIES = 3


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


@dataclass
# pylint: disable=R0801
class Dimension:
    id: str
    team_id: str
    dim_types: List[DimensionType]
    name: str
    entry_type: DimensionEntryType
    deleted: bool

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["dim_types"] = [dim_type.value for dim_type in self.dim_types]
        out["entry_type"] = self.entry_type.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Dimension":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            dim_types=[DimensionType(dim_type) for dim_type in data["dim_types"]],
            name=data["name"],
            entry_type=DimensionEntryType(data["entry_type"]),
            deleted=data["deleted"],
        )
