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

    weekNumber: int = Field(..., description="Week number in template")
    dayOfWeek: int = Field(..., description="Day of week (0-6)")
    shiftId: str = Field(..., description="Shift ID")


class ShiftDemandConcurrencyDTO(BaseModel):
    """Concurrency information for actual shift demands."""

    shiftDemandId: str = Field(..., description="The shift demand ID")
    concurrentShiftDemandIds: List[str] = Field(
        default_factory=list,
        description="List of shift demand IDs that can be worked concurrently",
    )


class TemplateConcurrencyDTO(BaseModel):
    """Concurrency information for template shift demands."""

    weekNumber: int = Field(..., description="Week number in template")
    dayOfWeek: int = Field(..., description="Day of week (0=Monday, 6=Sunday)")
    shiftId: str = Field(..., description="Shift ID")
    concurrentCombinations: List[ConcurrentCombinationDTO] = Field(
        default_factory=list,
        description=(
            "List of concurrent combinations with "
            "weekNumber, dayOfWeek, shiftId"
        ),
    )


class ShiftDemandConcurrencyResponseDTO(BaseModel):
    """Response containing all shift demand concurrency data for a period."""

    teamId: str = Field(..., description="Team ID")
    startDate: int = Field(
        ..., description="Period start date (Unix timestamp)"
    )
    endDate: int = Field(..., description="Period end date (Unix timestamp)")
    concurrencyList: List[ShiftDemandConcurrencyDTO] = Field(
        default_factory=list,
        description="List of shift demand concurrency information",
    )


class TemplateConcurrencyResponseDTO(BaseModel):
    """Response containing all template concurrency data."""

    teamId: str = Field(..., description="Team ID")
    templateId: str = Field(..., description="Template ID")
    concurrencyList: List[TemplateConcurrencyDTO] = Field(
        default_factory=list,
        description="List of template concurrency information",
    )


class ShiftDemandConcurrencyRequestDTO(BaseModel):
    """Request for shift demand concurrency data."""

    teamId: str = Field(
        ...,
        description="Team ID to get concurrency data for",
        min_length=1,
        max_length=50,
    )
    startDate: int = Field(
        ...,
        description="Period start date (Unix timestamp)",
        gt=0,
    )
    endDate: int = Field(
        ...,
        description="Period end date (Unix timestamp)",
        gt=0,
    )

    @field_validator("endDate")
    @classmethod
    def validate_date_range(cls, v: int, info: Any) -> int:
        """Validate that endDate is after startDate."""
        if "startDate" in info.data and v <= info.data["startDate"]:
            raise ValueError("endDate must be after startDate")
        return v

    @field_validator("startDate", "endDate")
    @classmethod
    def validate_reasonable_timestamp(cls, v: int) -> int:
        """Validate timestamp is reasonable (not too far in past/future)."""
        current_time = int(time.time())
        # Allow up to 10 years in past/future for flexibility
        ten_years = 10 * 365 * 24 * 60 * 60

        if v < current_time - ten_years or v > current_time + ten_years:
            raise ValueError("timestamp must be within reasonable range")
        return v
