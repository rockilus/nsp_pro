"""
Core schemas for multitasking and concurrency functionality.

This module contains core business models for handling shift concurrency
calculations, both for actual shift demands and template-based demands.
"""

from dataclasses import asdict, dataclass, field
from datetime import date as date_type
from datetime import datetime, timezone
from typing import List

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.multitasking import (
    ConcurrentCombinationDTO,
    ShiftDemandConcurrencyDTO,
    ShiftDemandConcurrencyRequestDTO,
    ShiftDemandConcurrencyResponseDTO,
    TemplateConcurrencyDTO,
    TemplateConcurrencyResponseDTO,
)


@dataclass
class ConcurrentCombination:
    """Core model for a single concurrent combination in template concurrency."""

    week_number: int
    day_of_week: int
    shift_id: str

    def __post_init__(self):
        """Validate the concurrent combination data."""
        if not 0 <= self.day_of_week <= 6:
            raise ValueError("Day of week must be between 0 (Monday) and 6 (Sunday)")
        if self.week_number < 1:
            raise ValueError("Week number must be positive")
        if not self.shift_id:
            raise ValueError("Shift ID cannot be empty")

    def to_dto(self) -> ConcurrentCombinationDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ConcurrentCombinationDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ConcurrentCombinationDTO) -> "ConcurrentCombination":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)
        return cls(**data_dict)


@dataclass
class ShiftDemandConcurrency:
    """Core model for shift demand concurrency information."""

    shift_demand_id: str
    concurrent_shift_demand_ids: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

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
    def from_dto(cls, data: ShiftDemandConcurrencyDTO) -> "ShiftDemandConcurrency":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)

        # Add server-managed timestamps
        now = datetime.now(timezone.utc)
        data_dict["created_at"] = now
        data_dict["updated_at"] = now

        return cls(**data_dict)


@dataclass
class TemplateConcurrency:
    """Core model for template concurrency information."""

    week_number: int
    day_of_week: int
    shift_id: str
    concurrent_combinations: List[ConcurrentCombination] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self):
        """Validate the template concurrency data."""
        if not 0 <= self.day_of_week <= 6:
            raise ValueError("Day of week must be between 0 (Monday) and 6 (Sunday)")
        if self.week_number < 1:
            raise ValueError("Week number must be positive")
        if not self.shift_id:
            raise ValueError("Shift ID cannot be empty")

    def add_concurrent_combination(self, combination: ConcurrentCombination) -> None:
        """Add a concurrent combination if not already present."""
        # Check for duplicates
        for existing in self.concurrent_combinations:
            if (
                existing.week_number == combination.week_number
                and existing.day_of_week == combination.day_of_week
                and existing.shift_id == combination.shift_id
            ):
                return  # Already exists

        # Don't add self-reference
        if (
            combination.week_number == self.week_number
            and combination.day_of_week == self.day_of_week
            and combination.shift_id == self.shift_id
        ):
            return

        self.concurrent_combinations.append(combination)
        self.update_timestamp()

    def remove_concurrent_combination(
        self, week_number: int, day_of_week: int, shift_id: str
    ) -> None:
        """Remove a concurrent combination if present."""
        self.concurrent_combinations = [
            combo
            for combo in self.concurrent_combinations
            if not (
                combo.week_number == week_number
                and combo.day_of_week == day_of_week
                and combo.shift_id == shift_id
            )
        ]
        self.update_timestamp()

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> TemplateConcurrencyDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)
        # Remove internal timestamps from DTO
        data.pop("created_at", None)
        data.pop("updated_at", None)

        # Convert concurrent combinations to DTOs
        data["concurrent_combinations"] = [
            combo.to_dto() for combo in self.concurrent_combinations
        ]

        as_dict = humps.camelize(data)
        validator = TypeAdapter(TemplateConcurrencyDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TemplateConcurrencyDTO) -> "TemplateConcurrency":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)

        # Convert concurrent combinations from DTOs
        combinations = []
        for combo_data in data_dict.get("concurrent_combinations", []):
            if isinstance(combo_data, dict):
                # Create ConcurrentCombinationDTO first, then convert to core
                combo_dto = ConcurrentCombinationDTO(**combo_data)
                combinations.append(ConcurrentCombination.from_dto(combo_dto))
            elif hasattr(combo_data, "model_dump"):
                # Already a DTO
                combinations.append(ConcurrentCombination.from_dto(combo_data))

        data_dict["concurrent_combinations"] = combinations

        # Add server-managed timestamps
        now = datetime.now(timezone.utc)
        data_dict["created_at"] = now
        data_dict["updated_at"] = now

        return cls(**data_dict)


@dataclass
class ShiftDemandConcurrencyResponse:
    """Core model for shift demand concurrency response."""

    team_id: str
    start_date: date_type
    end_date: date_type
    concurrency_list: List[ShiftDemandConcurrency] = field(default_factory=list)

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
        data["concurrency_list"] = [item.to_dto() for item in self.concurrency_list]

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
        data_dict["start_date"] = datetime.fromtimestamp(start_timestamp).date()
        data_dict["end_date"] = datetime.fromtimestamp(end_timestamp).date()

        # Convert concurrency list from DTOs
        concurrency_list = []
        for item_data in data_dict.get("concurrency_list", []):
            if isinstance(item_data, dict):
                # Create DTO first, then convert to core
                item_dto = ShiftDemandConcurrencyDTO(**item_data)
                concurrency_list.append(ShiftDemandConcurrency.from_dto(item_dto))
            elif hasattr(item_data, "model_dump"):
                # Already a DTO
                concurrency_list.append(ShiftDemandConcurrency.from_dto(item_data))

        data_dict["concurrency_list"] = concurrency_list

        return cls(**data_dict)


@dataclass
class TemplateConcurrencyResponse:
    """Core model for template concurrency response."""

    team_id: str
    template_id: str
    concurrency_list: List[TemplateConcurrency] = field(default_factory=list)

    def __post_init__(self):
        """Validate the response data."""
        if not self.team_id:
            raise ValueError("Team ID cannot be empty")
        if not self.template_id:
            raise ValueError("Template ID cannot be empty")

    def to_dto(self) -> TemplateConcurrencyResponseDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)

        # Convert concurrency list to DTOs
        data["concurrency_list"] = [item.to_dto() for item in self.concurrency_list]

        as_dict = humps.camelize(data)
        validator = TypeAdapter(TemplateConcurrencyResponseDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: TemplateConcurrencyResponseDTO
    ) -> "TemplateConcurrencyResponse":
        """Create instance from DTO."""
        data_dict = data.model_dump()
        data_dict = humps.decamelize(data_dict)

        # Convert concurrency list from DTOs
        concurrency_list = []
        for item_data in data_dict.get("concurrency_list", []):
            if isinstance(item_data, dict):
                # Create DTO first, then convert to core
                item_dto = TemplateConcurrencyDTO(**item_data)
                concurrency_list.append(TemplateConcurrency.from_dto(item_dto))
            elif hasattr(item_data, "model_dump"):
                # Already a DTO
                concurrency_list.append(TemplateConcurrency.from_dto(item_data))

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

        return ShiftDemandConcurrencyRequestDTO(
            team_id=self.team_id,
            start_date=int(start_datetime.timestamp()),
            end_date=int(end_datetime.timestamp()),
        )

    @classmethod
    def from_dto(
        cls, dto: ShiftDemandConcurrencyRequestDTO
    ) -> "ShiftDemandConcurrencyRequest":
        """Create from DTO."""
        return cls(
            team_id=dto.team_id,
            start_date=datetime.fromtimestamp(dto.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(dto.end_date, tz=timezone.utc).date(),
        )
