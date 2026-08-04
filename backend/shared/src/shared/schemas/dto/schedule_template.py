from typing import List, Optional

from pydantic import BaseModel, Field


class ScheduleTemplateEntryDTO(BaseModel):
    shiftId: str = Field(..., description="Shift identifier")
    dayOfWeek: int = Field(
        ..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)"
    )
    demandCount: int = Field(default=0, ge=0, description="Demand count, 0 means none")
    workerIds: List[str] = Field(
        default_factory=list, description="Worker IDs assigned, empty means none"
    )


class ScheduleTemplateWeekDataDTO(BaseModel):
    weekNumber: int = Field(..., ge=0, description="Week number (0-based)")
    entries: List[ScheduleTemplateEntryDTO] = Field(
        ..., description="List of template entries"
    )


class ScheduleTemplateDTO(BaseModel):
    id: str
    name: str = Field(..., min_length=1, max_length=100)
    teamId: str
    templateType: str = Field(..., pattern="^(standard|even_odd)$")
    weeksData: List[ScheduleTemplateWeekDataDTO]
    description: Optional[str] = Field(None, max_length=500)
    createdBy: str
    createdAt: float
    updatedAt: float


class ScheduleTemplateCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ScheduleTemplateUpdateDTO(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    templateType: Optional[str] = Field(None, pattern="^(standard|even_odd)$")
    weeksData: Optional[List[ScheduleTemplateWeekDataDTO]] = Field(
        None, min_length=1, max_length=8
    )


class ApplyScheduleTemplateToDateRangeDTO(BaseModel):
    templateId: str = Field(..., description="Template identifier")
    startDate: float = Field(..., description="Start date timestamp")
    endDate: float = Field(..., description="End date timestamp")
    startWeekNumber: int = Field(
        default=0, ge=0, description="Which template week to start rotation from"
    )
    overwriteDemands: bool = Field(
        default=True, description="Whether to overwrite existing demands"
    )
    overwriteAssignments: bool = Field(
        default=True, description="Whether to overwrite existing assignments"
    )


class ScheduleTemplateApplicationResult(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    demandsCreated: int = Field(..., description="Number of demands created")
    demandsDeleted: int = Field(..., description="Number of demands deleted")
    assignmentsCreated: int = Field(..., description="Number of assignments created")
    assignmentsDeleted: int = Field(..., description="Number of assignments deleted")
    message: str = Field(..., description="Result message")
