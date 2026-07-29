from typing import List, Optional

from pydantic import BaseModel, Field


class AssignmentTemplateEntryDTO(BaseModel):
    shiftId: str = Field(..., description="Shift identifier")
    dayOfWeek: int = Field(
        ..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)"
    )
    workerIds: List[str] = Field(
        ..., min_length=1, description="List of worker IDs assigned"
    )


class AssignmentTemplateWeekDataDTO(BaseModel):
    weekNumber: int = Field(..., ge=0, description="Week number (0-based)")
    entries: List[AssignmentTemplateEntryDTO] = Field(
        ..., description="List of assignment entries"
    )


class AssignmentTemplateDTO(BaseModel):
    id: str
    name: str = Field(..., min_length=1, max_length=100)
    teamId: str
    templateType: str = Field(..., pattern="^(standard|even_odd)$")
    weeksData: List[AssignmentTemplateWeekDataDTO]
    description: Optional[str] = Field(None, max_length=500)
    createdBy: str
    createdAt: float
    updatedAt: float


class AssignmentTemplateCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class AssignmentTemplateUpdateDTO(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    templateType: Optional[str] = Field(None, pattern="^(standard|even_odd)$")
    weeksData: Optional[List[AssignmentTemplateWeekDataDTO]] = Field(
        None, min_length=1, max_length=8
    )
    description: Optional[str] = Field(None, max_length=500)


class ApplyAssignmentsToTemplateWeekDTO(BaseModel):
    templateId: str = Field(..., description="Template identifier")
    sourceWeekStartDate: float = Field(
        ..., description="Timestamp of source week Monday"
    )
    targetWeekNumber: int = Field(
        ..., ge=0, description="0-based week number in template to update"
    )


class ApplyAssignmentTemplateToDateRangeDTO(BaseModel):
    templateId: str = Field(..., description="Template identifier")
    startDate: float = Field(..., description="Start date timestamp")
    endDate: float = Field(..., description="End date timestamp")
    overwriteExisting: bool = Field(
        default=True, description="Whether to overwrite existing assignments"
    )
    shiftId: Optional[str] = Field(
        None, description="Optional filter: only apply to this shift"
    )


class AssignmentTemplateApplicationResult(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    assignmentsCreated: int = Field(..., description="Number of assignments created")
    assignmentsDeleted: int = Field(..., description="Number of assignments deleted")
    message: str = Field(..., description="Result message")
