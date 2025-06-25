from dataclasses import asdict, dataclass, field
from datetime import date as date_type
from datetime import datetime, time, timezone
from enum import Enum
from typing import List, Optional

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.shift_demand_new import (
    ShiftDemandNewCreateDTO,
    ShiftDemandNewDTO,
    ShiftDemandNewUpdateDTO,
    ShiftDemandsResultDTO,
)


class ShiftDemandSource(str, Enum):
    """Source of the coverage target creation."""

    MANUAL = "manual"
    TEMPLATE = "template"
    DUPLICATED = "duplicated"
    RECURRENCE = "recurrence"


@dataclass
class ShiftDemandNew:
    """
    Represents daily demand for a specific shift.

    Coverage targets define how many staff members are needed for a particular
    shift on a specific date, enabling the solver to generate optimal schedules.
    """

    date: date_type
    shift_id: str
    team_id: str
    count: int
    notes: Optional[str] = None
    source: ShiftDemandSource = ShiftDemandSource.MANUAL
    source_id: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None

    def __post_init__(self):
        """Validate the coverage target data."""
        if self.count < 0:
            raise ValueError("Coverage target count must be non-negative")

        if self.notes and len(self.notes) > 500:
            raise ValueError("Notes must be 500 characters or less")

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        out = asdict(self)
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["source"] = self.source.value
        out["created_at"] = self.created_at.timestamp()
        out["updated_at"] = self.updated_at.timestamp()
        return out

    @classmethod
    def from_dict(cls, data: dict) -> "ShiftDemandNew":
        """Create instance from MongoDB document."""
        # Convert datetime back to date for the date field
        data["date"] = datetime.fromtimestamp(data["date"], tz=timezone.utc).date()
        data["created_at"] = datetime.fromtimestamp(data["created_at"], tz=timezone.utc)
        data["updated_at"] = datetime.fromtimestamp(data["updated_at"], tz=timezone.utc)
        data["source"] = ShiftDemandSource(data["source"])
        return cls(
            date=data["date"],
            shift_id=data["shift_id"],
            team_id=data["team_id"],
            count=data["count"],
            notes=data.get("notes"),
            source=data["source"],
            source_id=data.get("source_id"),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            id=data["id"],
        )

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> ShiftDemandNewDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["source"] = self.source.value
        data["created_at"] = self.created_at.timestamp()
        data["updated_at"] = self.updated_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandNewDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ShiftDemandNewDTO) -> "ShiftDemandNew":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        data_dict["updated_at"] = datetime.fromtimestamp(
            data_dict["updated_at"], tz=timezone.utc
        )
        data_dict["source"] = ShiftDemandSource(data.source)
        data_dict = humps.decamelize(data_dict)
        return cls(**data_dict)

    @classmethod
    def from_create_dto(cls, data: ShiftDemandNewCreateDTO) -> "ShiftDemandNew":
        """Create instance from create DTO with server-managed fields."""
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict["source"] = ShiftDemandSource(data.source)
        data_dict = humps.decamelize(data_dict)

        # Server-managed fields
        now = datetime.now(timezone.utc)
        data_dict["created_at"] = now
        data_dict["updated_at"] = now
        data_dict["id"] = None  # Will be set by service layer

        return cls(**data_dict)

    def update_from_dto(self, data: ShiftDemandNewUpdateDTO) -> None:
        """Update instance from update DTO with only provided fields."""
        data_dict = data.model_dump(exclude_unset=True)

        if "date" in data_dict:
            self.date = datetime.fromtimestamp(
                data_dict["date"], tz=timezone.utc
            ).date()

        if "shiftId" in data_dict:
            self.shift_id = data_dict["shiftId"]

        if "teamId" in data_dict:
            self.team_id = data_dict["teamId"]

        if "count" in data_dict:
            self.count = data_dict["count"]

        if "notes" in data_dict:
            self.notes = data_dict["notes"]

        if "source" in data_dict:
            self.source = ShiftDemandSource(data_dict["source"])

        if "sourceId" in data_dict:
            self.source_id = data_dict["sourceId"]

        # Always update timestamp on any change
        self.update_timestamp()


@dataclass
class DemandsResult:
    demands_created: List[ShiftDemandNew]
    demands_read: List[ShiftDemandNew]
    demands_updated: List[ShiftDemandNew]
    demands_deleted_ids: List[str]

    def to_dto(self) -> ShiftDemandsResultDTO:
        data = asdict(self)
        data["demands_created"] = [demand.to_dto() for demand in self.demands_created]
        data["demands_read"] = [demand.to_dto() for demand in self.demands_read]
        data["demands_updated"] = [demand.to_dto() for demand in self.demands_updated]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandsResultDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ShiftDemandsResultDTO) -> "DemandsResult":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["demands_created"] = [
            ShiftDemandNew.from_dto(demand) for demand in data_dict["demands_created"]
        ]
        data_dict["demands_read"] = [
            ShiftDemandNew.from_dto(demand) for demand in data_dict["demands_read"]
        ]
        data_dict["demands_updated"] = [
            ShiftDemandNew.from_dto(demand) for demand in data_dict["demands_updated"]
        ]
        return cls(**data_dict)
