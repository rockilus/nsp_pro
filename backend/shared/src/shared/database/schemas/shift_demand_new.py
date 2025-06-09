from datetime import datetime, time, timezone
from typing import Any, Dict, Optional

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.shift_demand_new import (
    ShiftDemandNew,
    ShiftDemandSource,
)


class ShiftDemandNewSchema(DocumentBaseSchema):
    """ShiftDemandNew schema for validation."""

    team: str
    shift: str
    date: float
    count: int
    notes: Optional[str] = None
    source: str
    source_id: Optional[str] = None
    created_at: float
    updated_at: float

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        """Validate source is a valid enum value."""
        if v not in [source.value for source in ShiftDemandSource]:
            raise ValueError(f"Invalid shift demand source: {v}")
        return v

    def to_mongo(self) -> Dict[str, Any]:
        """Convert to MongoDB document format."""
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ShiftDemandNewSchema":
        """Convert from MongoDB document format."""
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> ShiftDemandNew:
        """Convert to core domain model."""
        return ShiftDemandNew(
            id=self.id or "",
            team_id=self.team,
            shift_id=self.shift,
            date=datetime.fromtimestamp(self.date, tz=timezone.utc).date(),
            count=self.count,
            notes=self.notes,
            source=ShiftDemandSource(self.source),
            source_id=self.source_id,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            updated_at=datetime.fromtimestamp(self.updated_at, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, shift_demand: ShiftDemandNew) -> "ShiftDemandNewSchema":
        """Convert from core domain model."""
        return cls(
            id=shift_demand.id,
            team=shift_demand.team_id,
            shift=shift_demand.shift_id,
            date=datetime.combine(
                shift_demand.date, time.min, timezone.utc
            ).timestamp(),
            count=shift_demand.count,
            notes=shift_demand.notes,
            source=shift_demand.source.value,
            source_id=shift_demand.source_id,
            created_at=shift_demand.created_at.timestamp(),
            updated_at=shift_demand.updated_at.timestamp(),
        )
