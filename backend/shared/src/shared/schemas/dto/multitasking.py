"""
DTOs for multitasking and concurrency functionality.

This module contains data transfer objects for handling shift concurrency
calculations, both for actual shift demands and template-based demands.
"""

from __future__ import annotations

import time
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator


class ShiftDemandConcurrencyDTO(BaseModel):
    """Concurrency information for actual shift demands."""

    shiftDemandId: str = Field(..., description="The shift demand ID")
    concurrentShiftDemandIds: List[str] = Field(
        default_factory=list,
        description="List of shift demand IDs that can be worked concurrently",
    )


class ShiftDemandConcurrencyResponseDTO(BaseModel):  # OK
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


class MultitaskingGroupTypeDTO(str):
    SHIFT_DEMAND = "shift_demand"
    SHIFT_DEMAND_TEMPLATE = "shift_demand_template"
    ASSIGNMENT = "assignment"


class MultitaskingGroupDTO(BaseModel):
    """
    DTO for multitasking group, supporting shift demands, templates, and assignments.
    """

    id: Optional[str] = Field(
        default=None, description="Multitasking group ID"
    )
    type: str = Field(
        ...,
        description="Type of multitasking group (shift_demand, "
        + "shift_demand_template, assignment)",
    )
    teamId: str = Field(..., description="Team ID")
    relatedIds: List[str] = Field(
        ...,
        description="List of related entity IDs (must have at least 2)",
    )
    shiftDemandTemplateId: Optional[str] = Field(
        default=None,
        description="ID of the associated shift demand template, if applicable",
    )
    createdAt: int = Field(..., description="Creation timestamp (Unix epoch)")
    updatedAt: int = Field(
        ..., description="Last update timestamp (Unix epoch)"
    )
    notes: Optional[str] = Field(default=None, description="Optional notes")

    @field_validator("relatedIds")
    @classmethod
    def validate_related_ids(cls, v: List[str]) -> List[str]:
        if len(set(v)) < 2:
            raise ValueError("relatedIds must have at least 2 unique items")
        return list(set(v))

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {
            MultitaskingGroupTypeDTO.SHIFT_DEMAND,
            MultitaskingGroupTypeDTO.SHIFT_DEMAND_TEMPLATE,
            MultitaskingGroupTypeDTO.ASSIGNMENT,
        }
        if v not in allowed:
            raise ValueError(f"Invalid multitasking group type: {v}")
        return v

    # pylint: disable=too-few-public-methods
    class Config:
        schema_extra = {
            "example": {
                "id": "group_123",
                "type": "shift_demand_template",
                "teamId": "team_456",
                "relatedIds": ["demand_1", "demand_2"],
                "shiftDemandTemplateId": "template_789",
                "createdAt": 1718900000,
                "updatedAt": 1718903600,
                "notes": "Example multitasking group for template.",
            }
        }


class CreateMultitaskingGroupRequest(BaseModel):
    """
    Request DTO for creating a multitasking group.
    """

    type: str = Field(
        ...,
        description="Type of multitasking group (shift_demand, "
        + "shift_demand_template, assignment)",
    )
    teamId: str = Field(..., description="Team ID")
    relatedIds: List[str] = Field(
        ...,
        description="List of related entity IDs (must have at least 2)",
    )
    shiftDemandTemplateId: Optional[str] = Field(
        default=None,
        description="ID of the associated shift demand template, if applicable",
    )
    notes: Optional[str] = Field(default=None, description="Optional notes")

    @field_validator("relatedIds")
    @classmethod
    def validate_related_ids(cls, v: List[str]) -> List[str]:
        if len(set(v)) < 2:
            raise ValueError("relatedIds must have at least 2 unique items")
        return list(set(v))

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {
            "shift_demand",
            "shift_demand_template",
            "assignment",
        }
        if v not in allowed:
            raise ValueError(f"Invalid multitasking group type: {v}")
        return v


class UpdateMultitaskingGroupRequest(BaseModel):
    """
    Request DTO for updating a multitasking group. All fields except 'id' are optional.
    """

    id: str = Field(..., description="Multitasking group ID to update")
    type: Optional[str] = Field(
        default=None,
        description="Type of multitasking group (shift_demand, "
        + "shift_demand_template, assignment)",
    )
    teamId: Optional[str] = Field(default=None, description="Team ID")
    relatedIds: Optional[List[str]] = Field(
        default=None,
        description="List of related entity IDs (must have at least 2)",
    )
    shiftDemandTemplateId: Optional[str] = Field(
        default=None,
        description="ID of the associated shift demand template, if applicable",
    )
    notes: Optional[str] = Field(default=None, description="Optional notes")

    @field_validator("relatedIds")
    @classmethod
    def validate_related_ids(
        cls, v: Optional[List[str]]
    ) -> Optional[List[str]]:
        if v is not None and len(set(v)) < 2:
            raise ValueError("relatedIds must have at least 2 unique items")
        return list(set(v)) if v is not None else v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: Optional[str]) -> Optional[str]:
        allowed = {
            "shift_demand",
            "shift_demand_template",
            "assignment",
        }
        if v is not None and v not in allowed:
            raise ValueError(f"Invalid multitasking group type: {v}")
        return v
