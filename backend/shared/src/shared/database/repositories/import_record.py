"""Repository for import record documents."""

from datetime import datetime, timezone
from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.import_record import ImportRecordSchema
from shared.schemas.core.import_record import ImportRecord


class ImportRecordRepository(BaseRepository[ImportRecordSchema]):
    """Repository for import record documents."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "imports", ImportRecordSchema)

    def create_import(self, record: ImportRecord) -> ImportRecord:
        """Create a new import record."""
        schema = ImportRecordSchema.from_core(record)
        schema.created_at = datetime.now(timezone.utc)
        schema.updated_at = schema.created_at
        result = self.create(schema)
        return result.to_core()

    def get_imports(self) -> List[ImportRecord]:
        """Get all import records."""
        records = self.find_all()
        return [r.to_core() for r in records]

    def get_import_by_id(self, import_id: str) -> Optional[ImportRecord]:
        """Get an import by its ID."""
        record = self.find_by_id(import_id)
        if record is None:
            return None
        return record.to_core()

    def get_imports_by_user(self, user_id: str) -> List[ImportRecord]:
        """Get all imports created by a specific user."""
        records = self.find_all({"created_by": user_id})
        return [r.to_core() for r in records]

    def update_import(self, record: ImportRecord) -> ImportRecord:
        """Update an import record."""
        schema = ImportRecordSchema.from_core(record)
        schema.updated_at = datetime.now(timezone.utc)
        updated = self.update(schema)
        if updated is None:
            raise Exception(f"Import record with id {record.id} not found")
        return updated.to_core()

    def delete_import(self, import_id: str) -> None:
        """Delete an import by its ID."""
        result = self.delete(import_id)
        if result is False:
            raise Exception(
                f"Import record with id {import_id} not found or already deleted"
            )
