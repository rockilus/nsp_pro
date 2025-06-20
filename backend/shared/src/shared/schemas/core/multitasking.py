"""
Core schemas for multitasking and concurrency functionality.

This module contains core business models for handling shift concurrency
calculations, both for actual shift demands and template-based demands.
"""

from dataclasses import asdict, dataclass, field
from datetime import date as date_type
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.multitasking import (
    MultitaskingGroupDTO,
    ShiftDemandConcurrencyDTO,
    ShiftDemandConcurrencyRequestDTO,
    ShiftDemandConcurrencyResponseDTO,
)


@dataclass
class ShiftDemandConcurrency:  # OK
    """Core model for shift demand concurrency information."""

    shift_demand_id: str
    concurrent_shift_demand_ids: List[str] = field(default_factory=list)
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def __post_init__(self):
        """Validate the shift demand concurrency data."""
        if not self.shift_demand_id:
            raise ValueError("Shift demand ID cannot be empty")

        # Remove duplicates and self-references
        unique_ids = list(set(self.concurrent_shift_demand_ids))
        if self.shift_demand_id in unique_ids:
            unique_ids.remove(self.shift_demand_id)
        self.concurrent_shift_demand_ids = unique_ids

    def add_concurrent_demand(self, demand_id: str) -> None:
        """Add a concurrent demand ID if not already present."""
        if (
            demand_id != self.shift_demand_id
            and demand_id not in self.concurrent_shift_demand_ids
        ):
            self.concurrent_shift_demand_ids.append(demand_id)
            self.update_timestamp()

    def remove_concurrent_demand(self, demand_id: str) -> None:
        """Remove a concurrent demand ID if present."""
        if demand_id in self.concurrent_shift_demand_ids:
            self.concurrent_shift_demand_ids.remove(demand_id)
            self.update_timestamp()

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> ShiftDemandConcurrencyDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)
        # Remove internal timestamps from DTO
        data.pop("created_at", None)
        data.pop("updated_at", None)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandConcurrencyDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: ShiftDemandConcurrencyDTO
    ) -> "ShiftDemandConcurrency":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)

        # Add server-managed timestamps
        now = datetime.now(timezone.utc)
        data_dict["created_at"] = now
        data_dict["updated_at"] = now

        return cls(**data_dict)


@dataclass
class ShiftDemandConcurrencyResponse:  # OK
    """Core model for shift demand concurrency response."""

    team_id: str
    start_date: date_type
    end_date: date_type
    concurrency_list: List[ShiftDemandConcurrency] = field(
        default_factory=list
    )

    def __post_init__(self):
        """Validate the response data."""
        if not self.team_id:
            raise ValueError("Team ID cannot be empty")
        if self.start_date > self.end_date:
            raise ValueError("Start date must be before or equal to end date")

    def to_dto(self) -> ShiftDemandConcurrencyResponseDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)

        # Convert dates to timestamps
        start_datetime = datetime.combine(self.start_date, datetime.min.time())
        end_datetime = datetime.combine(self.end_date, datetime.min.time())
        data["start_date"] = int(start_datetime.timestamp())
        data["end_date"] = int(end_datetime.timestamp())

        # Convert concurrency list to DTOs
        data["concurrency_list"] = [
            item.to_dto() for item in self.concurrency_list
        ]

        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandConcurrencyResponseDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: ShiftDemandConcurrencyResponseDTO
    ) -> "ShiftDemandConcurrencyResponse":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)

        # Convert timestamps to dates
        start_timestamp = data_dict["start_date"]
        end_timestamp = data_dict["end_date"]
        data_dict["start_date"] = datetime.fromtimestamp(
            start_timestamp
        ).date()
        data_dict["end_date"] = datetime.fromtimestamp(end_timestamp).date()

        # Convert concurrency list from DTOs
        concurrency_list = []
        for item_data in data_dict.get("concurrency_list", []):
            if isinstance(item_data, dict):
                # Create DTO first, then convert to core
                item_dto = ShiftDemandConcurrencyDTO(**item_data)
                concurrency_list.append(
                    ShiftDemandConcurrency.from_dto(item_dto)
                )
            elif hasattr(item_data, "model_dump"):
                # Already a DTO
                concurrency_list.append(
                    ShiftDemandConcurrency.from_dto(item_data)
                )

        data_dict["concurrency_list"] = concurrency_list

        return cls(**data_dict)


@dataclass
class ShiftDemandConcurrencyRequest:
    """Core model for shift demand concurrency request."""

    team_id: str
    start_date: date_type
    end_date: date_type

    def __post_init__(self):
        """Validate the request data."""
        if not self.team_id:
            raise ValueError("team_id cannot be empty")

        if self.start_date > self.end_date:
            raise ValueError("start_date must be before or equal to end_date")

    def to_dto(self) -> ShiftDemandConcurrencyRequestDTO:
        """Convert to DTO for API requests."""
        # Convert dates to timestamps
        start_datetime = datetime.combine(self.start_date, datetime.min.time())
        end_datetime = datetime.combine(self.end_date, datetime.min.time())

        data = {
            "team_id": self.team_id,
            "start_date": int(start_datetime.timestamp()),
            "end_date": int(end_datetime.timestamp()),
        }

        # Convert to camelCase for DTO
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandConcurrencyRequestDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, dto: ShiftDemandConcurrencyRequestDTO
    ) -> "ShiftDemandConcurrencyRequest":
        """Create from DTO."""
        data_dict = dto.model_dump()
        data_dict = humps.decamelize(data_dict)

        return cls(
            team_id=data_dict["team_id"],
            start_date=datetime.fromtimestamp(
                data_dict["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(
                data_dict["end_date"], tz=timezone.utc
            ).date(),
        )


@dataclass
class MultitaskingGroupType(Enum):
    SHIFT_DEMAND = "shift_demand"
    SHIFT_DEMAND_TEMPLATE = "shift_demand_template"
    ASSIGNMENT = "assignment"


@dataclass
class MultitaskingGroup:
    """
    Core model for multitasking group, supporting shift demands, templates, and
    assignments.
    """

    type: MultitaskingGroupType
    team_id: str
    related_ids: List[str] = field(default_factory=list)
    shift_demand_template_id: Optional[str] = None  # For template association
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    notes: Optional[str] = None
    id: Optional[str] = None

    def __post_init__(self):
        if not self.team_id:
            raise ValueError("MultitaskingGroup team_id cannot be empty")
        if not isinstance(self.type, MultitaskingGroupType):
            raise ValueError("Invalid MultitaskingGroup type")
        # Remove duplicates in related_ids
        self.related_ids = list(set(self.related_ids))
        if len(self.related_ids) < 2:
            raise ValueError(
                "MultitaskingGroup related_ids must have at least 2 items"
            )
        if self.shift_demand_template_id == "":
            self.shift_demand_template_id = None

    def add_related_id(self, related_id: str) -> None:
        if related_id not in self.related_ids:
            self.related_ids.append(related_id)
            self.update_timestamp()

    def remove_related_id(self, related_id: str) -> None:
        if related_id in self.related_ids:
            self.related_ids.remove(related_id)
            self.update_timestamp()

    def update_timestamp(self):
        self.updated_at = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        data = asdict(self)
        data["type"] = self.type.value
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "MultitaskingGroup":
        data = data.copy()
        data["type"] = MultitaskingGroupType(data["type"])
        return cls(**data)

    def to_dto(self) -> MultitaskingGroupDTO:
        """Convert to DTO for API responses."""

        return MultitaskingGroupDTO(
            id=self.id,
            type=self.type.value,
            teamId=self.team_id,
            relatedIds=list(self.related_ids),
            shiftDemandTemplateId=self.shift_demand_template_id,
            createdAt=int(self.created_at.timestamp()),
            updatedAt=int(self.updated_at.timestamp()),
            notes=self.notes,
        )

    @classmethod
    def from_dto(cls, dto: "MultitaskingGroupDTO") -> "MultitaskingGroup":
        """Create instance from DTO."""
        return cls(
            id=dto.id,
            type=MultitaskingGroupType(dto.type),
            team_id=dto.teamId,
            related_ids=list(dto.relatedIds),
            shift_demand_template_id=dto.shiftDemandTemplateId,
            created_at=datetime.fromtimestamp(dto.createdAt, tz=timezone.utc),
            updated_at=datetime.fromtimestamp(dto.updatedAt, tz=timezone.utc),
            notes=dto.notes,
        )
