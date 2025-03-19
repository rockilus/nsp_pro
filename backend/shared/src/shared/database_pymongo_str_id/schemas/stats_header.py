from typing import List

from shared.database_pymongo_str_id.schemas.base import DocumentBaseSchema
from shared.database_pymongo_str_id.schemas.constraint_build import (
    ShiftWorkerOptionSchema,
)
from shared.schemas.schemas.stats import (
    HeaderUnitOptions,
    StatsHeader,
    StatsUnitOptions,
)


class StatsHeaderSchema(DocumentBaseSchema):
    """StatsHeader schema for validation."""

    team: str  # Store team ID instead of reference
    stats_unit: int
    header_unit: int
    value: str
    selected_shifts: List[ShiftWorkerOptionSchema] = []

    def to_mongo(self) -> dict:
        out = super().to_mongo()
        out["selected_shifts"] = [swo.to_mongo() for swo in self.selected_shifts]
        return out

    @classmethod
    def from_mongo(cls, data: dict) -> "StatsHeaderSchema":
        data["id"] = str(data.pop("_id"))
        data["selected_shifts"] = [
            ShiftWorkerOptionSchema.from_mongo(swo) for swo in data["selected_shifts"]
        ]
        return cls(**data)

    def to_core(self) -> StatsHeader:
        return StatsHeader(
            id=self.id or "",
            team_id=self.team,
            stats_unit=StatsUnitOptions(self.stats_unit),
            header_unit=HeaderUnitOptions(self.header_unit),
            value=self.value,
            selected_shifts=[swo.to_core() for swo in self.selected_shifts],
            is_favorite=True,
        )

    @classmethod
    def from_core(cls, stats_header: StatsHeader) -> "StatsHeaderSchema":
        return cls(
            id=stats_header.id,
            team=stats_header.team_id,
            stats_unit=stats_header.stats_unit.value,
            header_unit=stats_header.header_unit.value,
            value=stats_header.value,
            selected_shifts=[
                ShiftWorkerOptionSchema.from_core(swo)
                for swo in stats_header.selected_shifts
            ],
        )
