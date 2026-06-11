"""MongoDB schema for import records."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import Field

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.import_record import ImportRecord


class ImportRecordSchema(DocumentBaseSchema):
    """Schema for persisted import documents."""

    name: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    created_by: str  # Cognito user ID
    filename: str
    team_id: Optional[str] = None
    members: List[Dict[str, Any]] = []
    shifts: List[Dict[str, Any]] = []
    requests: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []

    def to_core(self) -> ImportRecord:
        return ImportRecord(
            id=self.id or "",
            name=self.name,
            created_at=self.created_at,
            updated_at=self.updated_at,
            created_by=self.created_by,
            filename=self.filename,
            team_id=self.team_id,
            members=self.members,
            shifts=self.shifts,
            requests=self.requests,
            assignments=self.assignments,
        )

    @classmethod
    def from_core(cls, record: ImportRecord) -> "ImportRecordSchema":
        return cls(
            id=record.id or None,
            name=record.name,
            created_at=record.created_at,
            updated_at=record.updated_at,
            created_by=record.created_by,
            filename=record.filename,
            team_id=record.team_id,
            members=record.members,
            shifts=record.shifts,
            requests=record.requests,
            assignments=record.assignments,
        )
