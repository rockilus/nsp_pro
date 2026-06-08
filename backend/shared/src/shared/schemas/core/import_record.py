"""Core domain model for import records."""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.import_record import ImportRecordDTO


@dataclass
class ImportRecord:
    """A persisted import with its data and metadata."""

    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    created_by: str
    filename: str
    team_id: Optional[str] = None
    members: List[Dict[str, Any]] = field(default_factory=list)
    shifts: List[Dict[str, Any]] = field(default_factory=list)
    requests: List[Dict[str, Any]] = field(default_factory=list)
    assignments: List[Dict[str, Any]] = field(default_factory=list)

    def to_dto(self) -> ImportRecordDTO:
        data = asdict(self)
        data["created_at"] = self.created_at.timestamp()
        data["updated_at"] = self.updated_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ImportRecordDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ImportRecordDTO) -> "ImportRecord":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        data_dict["updated_at"] = datetime.fromtimestamp(
            data_dict["updated_at"], tz=timezone.utc
        )
        return cls(**data_dict)
