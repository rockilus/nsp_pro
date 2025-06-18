"""
DTOs for multitasking and concurrency functionality.

This module contains data transfer objects for handling shift concurrency
calculations, both for actual shift demands and template-based demands.
"""

from datetime import date
from typing import List

from pydantic import BaseModel, Field


class ConcurrentCombination(BaseModel):
    """A single concurrent combination for template concurrency."""

    week_number: int = Field(..., description="Week number in template")
    day_of_week: int = Field(..., description="Day of week (0-6)")
    shift_id: str = Field(..., description="Shift ID")


class ShiftDemandConcurrency(BaseModel):
    """Concurrency information for actual shift demands."""

    shift_demand_id: str = Field(..., description="The shift demand ID")
    concurrent_shift_demand_ids: List[str] = Field(
        default_factory=list,
        description="List of shift demand IDs that can be worked concurrently",
    )


class TemplateConcurrency(BaseModel):
    """Concurrency information for template shift demands."""

    week_number: int = Field(..., description="Week number in template")
    day_of_week: int = Field(..., description="Day of week (0=Monday, 6=Sunday)")
    shift_id: str = Field(..., description="Shift ID")
    concurrent_combinations: List[ConcurrentCombination] = Field(
        default_factory=list,
        description=(
            "List of concurrent combinations with " "week_number, day_of_week, shift_id"
        ),
    )


class ShiftDemandConcurrencyResponse(BaseModel):
    """Response containing all shift demand concurrency data for a period."""

    team_id: str = Field(..., description="Team ID")
    start_date: date = Field(..., description="Period start date")
    end_date: date = Field(..., description="Period end date")
    concurrency_list: List[ShiftDemandConcurrency] = Field(
        default_factory=list,
        description="List of shift demand concurrency information",
    )


class TemplateConcurrencyResponse(BaseModel):
    """Response containing all template concurrency data."""

    team_id: str = Field(..., description="Team ID")
    template_id: str = Field(..., description="Template ID")
    concurrency_list: List[TemplateConcurrency] = Field(
        default_factory=list,
        description="List of template concurrency information",
    )
