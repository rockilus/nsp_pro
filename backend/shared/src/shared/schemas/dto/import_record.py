"""API DTOs for import records."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ImportRecordDTO(BaseModel):
    """Full import record returned by the API."""

    id: str
    name: str
    createdAt: float  # UNIX timestamp
    updatedAt: float  # UNIX timestamp
    createdBy: str
    filename: str
    teamId: Optional[str] = None
    members: List[Dict[str, Any]] = []
    shifts: List[Dict[str, Any]] = []
    requests: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []


class ImportRecordSummaryDTO(BaseModel):
    """Lightweight import summary for list views (no data arrays)."""

    id: str
    name: str
    createdAt: float
    updatedAt: float
    createdBy: str
    createdByName: str = ""
    filename: str
    teamId: Optional[str] = None
    memberCount: int = 0
    shiftCount: int = 0
    requestCount: int = 0
    assignmentCount: int = 0


class CreateImportRequest(BaseModel):
    """Request body for creating an import."""

    name: str
    filename: str
    teamId: Optional[str] = None
    previewData: Dict[str, Any]  # full ImportPreviewDTO serialized


class UpdateImportRequest(BaseModel):
    """Request body for updating an import (all fields optional)."""

    name: Optional[str] = None
    teamId: Optional[str] = None
    members: Optional[List[Dict[str, Any]]] = None
    shifts: Optional[List[Dict[str, Any]]] = None
    requests: Optional[List[Dict[str, Any]]] = None
    assignments: Optional[List[Dict[str, Any]]] = None
