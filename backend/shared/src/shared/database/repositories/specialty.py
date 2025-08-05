from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.specialty import SpecialtySchema
from shared.schemas.core.specialty import Specialty


class SpecialtyRepository(BaseRepository[SpecialtySchema]):
    """Repository for specialty documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "specialties", SpecialtySchema)

    def create_specialty(self, specialty: Specialty) -> Specialty:
        """Create a new specialty."""
        specialty_schema = SpecialtySchema.from_core(specialty)
        result = self.create(specialty_schema)
        return result.to_core()

    def get_specialty_by_id(self, specialty_id: str) -> Specialty:
        """Get a specialty by its ID."""
        specialty = self.find_by_id(specialty_id)
        if not specialty:
            raise Exception(f"Specialty with id {specialty_id} not found")
        return specialty.to_core()

    def get_specialties_by_team_id(self, team_id: str) -> List[Specialty]:
        """Get all specialties for a team."""
        specialties = self.find_all({"team": team_id})
        return [specialty.to_core() for specialty in specialties]

    def get_specialties_not_deleted_by_team_id(self, team_id: str) -> List[Specialty]:
        """Get all non-deleted specialties for a team."""
        specialties = self.find_all({"team": team_id, "deleted": False})
        return [specialty.to_core() for specialty in specialties]

    def get_specialties_by_team_ids(self, team_ids: List[str]) -> List[Specialty]:
        """Get multiple specialties by their team IDs."""
        specialties = self.find_all({"team": {"$in": team_ids}})
        return [specialty.to_core() for specialty in specialties]

    def update_specialty(self, specialty: Specialty) -> Specialty:
        """Update a specialty."""
        specialty_schema = SpecialtySchema.from_core(specialty)
        specialty_updated = self.update(specialty_schema)
        assert specialty_updated is not None
        return specialty_updated.to_core()

    def delete_specialty(self, specialty_id: str) -> None:
        """Delete a specialty by its ID."""
        result = self.delete(specialty_id)
        if result is False:
            raise Exception(
                f"Specialty with id {specialty_id} not found or already deleted"
            )

    def logical_delete_specialty(self, specialty_id: str) -> Specialty:
        """Mark a specialty as deleted."""
        result = self.collection.update_one(
            {"_id": specialty_id}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Specialty with id {specialty_id} not found")

        specialty = self.find_by_id(specialty_id)
        if not specialty:
            raise Exception(
                f"Failed to retrieve updated specialty with id {specialty_id}"
            )

        return specialty.to_core()
