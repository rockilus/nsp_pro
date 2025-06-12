from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class TemplateWeekDataDTO(BaseModel):
    """DTO for template week data."""

    weekNumber: int = Field(..., ge=0, description="Week number (0-based)")
    demands: Dict[str, List[int]] = Field(
        ..., description="Shift ID to daily demands mapping"
    )


class ShiftDemandTemplateDTO(BaseModel):
    """DTO for shift demand template responses."""

    id: str
    name: str = Field(..., min_length=1, max_length=100)
    teamId: str
    templateType: str = Field(..., pattern="^(standard|even_odd)$")
    weeksData: List[TemplateWeekDataDTO]
    description: Optional[str] = Field(None, max_length=500)
    createdBy: str
    createdAt: float
    updatedAt: float


class ShiftDemandTemplateCreateDTO(BaseModel):
    """DTO for creating shift demand templates."""

    name: str = Field(..., min_length=1, max_length=100)
    templateType: str = Field(..., pattern="^(standard|even_odd)$")
    weeksData: List[TemplateWeekDataDTO] = Field(..., min_length=1, max_length=8)
    description: Optional[str] = Field(None, max_length=500)


class ShiftDemandTemplateUpdateDTO(BaseModel):
    """DTO for updating shift demand templates."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    templateType: Optional[str] = Field(None, pattern="^(standard|even_odd)$")
    weeksData: Optional[List[TemplateWeekDataDTO]] = Field(
        None, min_length=1, max_length=8
    )
    description: Optional[str] = Field(None, max_length=500)


class TemplateFromDemandsDTO(BaseModel):
    """DTO for creating template from existing shift demands."""

    name: str = Field(..., min_length=1, max_length=100)
    templateType: str = Field(..., pattern="^(standard|even_odd)$")
    description: Optional[str] = Field(None, max_length=500)
    startDate: float = Field(..., description="Start date timestamp")
    endDate: float = Field(..., description="End date timestamp")


class ApplyTemplateDTO(BaseModel):
    """DTO for applying template to specific dates."""

    templateId: str
    startDate: float = Field(..., description="Start date timestamp for application")
    overwriteExisting: bool = Field(
        default=False, description="Whether to overwrite existing demands"
    )
