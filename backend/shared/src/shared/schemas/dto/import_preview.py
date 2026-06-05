"""DTOs for the import preview endpoint.

These DTOs represent the parsed and validated contents of an Excel import
*before* any data is persisted. Each preview item includes a generated ID
(for reference in the UI) and a list of validation warnings.
"""

from typing import List, Optional

from pydantic import BaseModel


class ImportMemberPreviewDTO(BaseModel):
    """A worker parsed from the 'members' Excel sheet."""

    generatedId: str
    name: str
    acronym: str
    acronymCustom: bool
    employmentStartDate: float  # UNIX timestamp
    employmentEndDate: Optional[float] = None
    weeklyHours: int
    weeklyHoursDesired: int
    dutiesPerMonth: int
    annualLeave: int
    specialtyIds: List[str]
    warnings: List[str]
    defaultedFields: List[str] = []


class ImportShiftPreviewDTO(BaseModel):
    """A shift parsed from the 'shifts' Excel sheet."""

    generatedId: str
    name: str
    acronym: str
    acronymCustom: bool
    startTime: float  # minutes from midnight
    endTime: float
    staffing: (
        list  # List[StaffingDTO] — keep as list to avoid circular imports
    )
    color: str
    shiftType: int
    restType: int
    leaveType: int
    recuperationTime: int
    recuperationDutyId: Optional[str] = None
    duty: bool
    mandatoryRest: bool
    warnings: List[str]
    defaultedFields: List[str] = []


class ImportRequestPreviewDTO(BaseModel):
    """A leave request parsed from 'leave' cells in the schedule sheet."""

    generatedId: str
    workerName: str
    workerId: str
    requestType: str  # "leave"
    startDate: float
    endDate: float
    shiftCode: str
    status: str  # "approved"
    fulfillment: str  # "fulfilled"
    warnings: List[str]
    defaultedFields: List[str] = []


class ImportAssignmentPreviewDTO(BaseModel):
    """An assignment parsed from a non-empty cell in the schedule sheet."""

    generatedId: str
    workerName: str
    workerId: str
    date: float  # UNIX timestamp
    shiftCode: str
    shiftId: str
    fixed: bool
    source: str
    warnings: List[str]


class ImportPreviewDTO(BaseModel):
    """Complete preview of an Excel import before any data is persisted."""

    members: List[ImportMemberPreviewDTO]
    shifts: List[ImportShiftPreviewDTO]
    requests: List[ImportRequestPreviewDTO]
    assignments: List[ImportAssignmentPreviewDTO]
    errors: List[str]  # fatal errors that prevent import
    warnings: List[str]  # non-fatal issues across all entities
