from typing import List

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.dimension import DimEntrySchema
from shared.schemas.schemas.dimension import DimEntry


class DimEntryRepository(BaseRepository[DimEntrySchema]):
    """Repository for dim entry documents using PyMongo."""

    def __init__(self):
        super().__init__("dim_entries", DimEntrySchema)

    def create_dim_entry(self, dim_entry: DimEntry) -> DimEntry:
        """Create a new dim entry."""
        dim_entry_schema = DimEntrySchema.from_core(dim_entry)
        result = self.create(dim_entry_schema)
        return result.to_core()

    def get_dim_entry_by_id(self, dim_entry_id: str) -> DimEntry:
        """Get a dim entry by its ID."""
        dim_entry = self.find_by_id(dim_entry_id)
        if not dim_entry:
            raise Exception(f"Dim entry with id {dim_entry_id} not found")
        return dim_entry.to_core()

    def get_dim_entries_by_dim_id(self, dimension_id: str) -> List[DimEntry]:
        """Get all dim entries for a dimension."""
        dim_entries = self.find_all({"dimension": dimension_id})
        return [dim_entry.to_core() for dim_entry in dim_entries]

    def get_dim_entries_by_dim_ids(self, dimension_ids: List[str]) -> List[DimEntry]:
        """Get all dim entries for a list of dimension IDs."""
        dim_entries = self.find_all({"dimension": {"$in": dimension_ids}})
        return [dim_entry.to_core() for dim_entry in dim_entries]

    def update_dim_entry(self, dim_entry: DimEntry) -> DimEntry:
        """Update a dim entry."""
        dim_entry_schema = DimEntrySchema.from_core(dim_entry)
        dim_entry_updated = self.update(dim_entry_schema)
        assert dim_entry_updated is not None
        return dim_entry_updated.to_core()

    def delete_dim_entry(self, dim_entry_id: str) -> None:
        """Delete a dim entry by its ID."""
        result = self.delete(dim_entry_id)
        if result is False:
            raise Exception(
                f"Dim entry with id {dim_entry_id} not found or already deleted"
            )

    def logical_delete_dim_entry(self, dim_entry_id: str) -> DimEntry:
        """Mark a dim entry as deleted."""
        result = self.collection.update_one(
            {"_id": dim_entry_id}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Dim entry with id {dim_entry_id} not found")

        dim_entry = self.find_by_id(dim_entry_id)
        if not dim_entry:
            raise Exception(
                f"Failed to retrieve updated dim entry with id {dim_entry_id}"
            )

        return dim_entry.to_core()
