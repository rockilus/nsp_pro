"""
DTOs for multitasking and concurrency functionality.

This module contains data transfer objects for handling shift concurrency
calculations, both for actual shift demands and template-based demands.
"""

from __future__ import annotations

import time
from typing import Any, List

from pydantic import BaseModel, Field, field_validator


class ConcurrentCombinationDTO(BaseModel):
    """A single concurrent combination for template concurrency."""

    week_number: int = Field(..., description="Week number in template")
    day_of_week: int = Field(..., description="Day of week (0-6)")
    shift_id: str = Field(..., description="Shift ID")


class ShiftDemandConcurrencyDTO(BaseModel):
    """Concurrency information for actual shift demands."""

    shift_demand_id: str = Field(..., description="The shift demand ID")
    concurrent_shift_demand_ids: List[str] = Field(
        default_factory=list,
        description="List of shift demand IDs that can be worked concurrently",
    )


class TemplateConcurrencyDTO(BaseModel):
    """Concurrency information for template shift demands."""

    week_number: int = Field(..., description="Week number in template")
    day_of_week: int = Field(..., description="Day of week (0=Monday, 6=Sunday)")
    shift_id: str = Field(..., description="Shift ID")
    concurrent_combinations: List[ConcurrentCombinationDTO] = Field(
        default_factory=list,
        description=(
            "List of concurrent combinations with " "week_number, day_of_week, shift_id"
        ),
    )


class ShiftDemandConcurrencyResponseDTO(BaseModel):
    """Response containing all shift demand concurrency data for a period."""

    team_id: str = Field(..., description="Team ID")
    start_date: int = Field(..., description="Period start date (Unix timestamp)")
    end_date: int = Field(..., description="Period end date (Unix timestamp)")
    concurrency_list: List[ShiftDemandConcurrencyDTO] = Field(
        default_factory=list,
        description="List of shift demand concurrency information",
    )


class TemplateConcurrencyResponseDTO(BaseModel):
    """Response containing all template concurrency data."""

    team_id: str = Field(..., description="Team ID")
    template_id: str = Field(..., description="Template ID")
    concurrency_list: List[TemplateConcurrencyDTO] = Field(
        default_factory=list,
        description="List of template concurrency information",
    )


class ShiftDemandConcurrencyRequestDTO(BaseModel):
    """Request for shift demand concurrency data."""

    team_id: str = Field(
        ...,
        description="Team ID to get concurrency data for",
        min_length=1,
        max_length=50,
    )
    start_date: int = Field(
        ...,
        description="Period start date (Unix timestamp)",
        gt=0,
    )
    end_date: int = Field(
        ...,
        description="Period end date (Unix timestamp)",
        gt=0,
    )

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v: int, info: Any) -> int:
        """Validate that end_date is after start_date."""
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_reasonable_timestamp(cls, v: int) -> int:
        """Validate timestamp is reasonable (not too far in past/future)."""
        current_time = int(time.time())
        # Allow up to 10 years in past/future for flexibility
        ten_years = 10 * 365 * 24 * 60 * 60

        if v < current_time - ten_years or v > current_time + ten_years:
            raise ValueError("timestamp must be within reasonable range")
        return v
