"""Service for persisting and managing import records."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from shared.schemas.core.import_record import ImportRecord

from src.services.base_service import BaseService

logger = logging.getLogger(__name__)


class ImportPersistenceService(BaseService):
    """CRUD operations for import records."""

    def create_import(
        self,
        preview_data: dict,
        name: str,
        filename: str,
        user_id: str,
        team_id: Optional[str] = None,
    ) -> ImportRecord:
        """Create a new import record from preview data.

        Args:
            preview_data: Serialized ImportPreviewDTO (members, shifts, etc.)
            name: Display name (auto-generated if empty).
            filename: Original uploaded filename.
            user_id: Cognito user ID of the creator.
            team_id: Optional target team ID.

        Returns:
            The created ImportRecord.
        """
        now = datetime.now(timezone.utc)

        # Auto-generate name if empty
        if not name or not name.strip():
            name = f"Import {now.strftime('%Y-%m-%d %H:%M')}"

        record = ImportRecord(
            id="",  # assigned by repository
            name=name.strip(),
            created_at=now,
            updated_at=now,
            created_by=user_id,
            filename=filename,
            team_id=team_id,
            members=preview_data.get("members", []),
            shifts=preview_data.get("shifts", []),
            requests=preview_data.get("requests", []),
            assignments=preview_data.get("assignments", []),
        )

        return self.collection.import_record_db.create_import(record)

    def get_imports(self, user_id: str) -> List[ImportRecord]:
        """Get all imports for a user."""
        return self.collection.import_record_db.get_imports_by_user(user_id)

    def get_import(self, import_id: str) -> Optional[ImportRecord]:
        """Get a single import by ID."""
        return self.collection.import_record_db.get_import_by_id(import_id)

    def update_import(
        self,
        import_id: str,
        name: Optional[str] = None,
        team_id: Optional[str] = None,
        members: Optional[List[dict]] = None,
        shifts: Optional[List[dict]] = None,
        requests: Optional[List[dict]] = None,
        assignments: Optional[List[dict]] = None,
    ) -> ImportRecord:
        """Partially update an import record.

        Only provided fields are updated; others remain unchanged.
        """
        existing = self.collection.import_record_db.get_import_by_id(import_id)
        if existing is None:
            raise ValueError(f"Import record '{import_id}' not found")

        if name is not None:
            existing.name = name
        if team_id is not None:
            existing.team_id = team_id
        if members is not None:
            existing.members = members
        if shifts is not None:
            existing.shifts = shifts
        if requests is not None:
            existing.requests = requests
        if assignments is not None:
            existing.assignments = assignments

        existing.updated_at = datetime.now(timezone.utc)

        return self.collection.import_record_db.update_import(existing)

    def delete_import(self, import_id: str) -> None:
        """Delete an import record."""
        self.collection.import_record_db.delete_import(import_id)
