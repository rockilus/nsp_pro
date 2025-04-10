from typing import List

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.constraint_build import (
    ConstraintBuildSchema,
)
from shared.schemas.core.constraint import ConstraintBuild


class ConstraintBuildRepository(BaseRepository[ConstraintBuildSchema]):
    """Repository for constraint build documents using PyMongo."""

    def __init__(self):
        super().__init__("constraint_builds", ConstraintBuildSchema)

    def create_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        """Create a new constraint build."""
        constraint_build_schema = ConstraintBuildSchema.from_core(constraint_build)
        result = self.create(constraint_build_schema)
        return result.to_core()

    def get_constraint_builds(self, team_id: str) -> List[ConstraintBuild]:
        """Get all constraint builds for a team."""
        constraint_builds = self.find_all({"team": team_id})
        return [cb.to_core() for cb in constraint_builds]

    def get_constraint_build_by_id(self, constraint_build_id: str) -> ConstraintBuild:
        """Get a constraint build by its ID."""
        constraint_build = self.find_by_id(constraint_build_id)
        if not constraint_build:
            raise Exception(f"Constraint build with id {constraint_build_id} not found")
        return constraint_build.to_core()

    def get_constraint_builds_by_ids(
        self, constraint_build_ids: List[str]
    ) -> List[ConstraintBuild]:
        """Get multiple constraint builds by their IDs."""
        constraint_builds = self.find_all({"_id": {"$in": constraint_build_ids}})
        return [cb.to_core() for cb in constraint_builds]

    def update_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        """Update a constraint build."""
        constraint_build_schema = ConstraintBuildSchema.from_core(constraint_build)
        constraint_build_updated = self.update(constraint_build_schema)
        assert constraint_build_updated is not None
        return constraint_build_updated.to_core()

    def delete_constraint_build(self, constraint_build_id: str) -> None:
        """Delete a constraint build by its ID."""
        result = self.delete(constraint_build_id)
        if result is False:
            raise Exception(
                f"Constraint build with id {constraint_build_id} not found or "
                + "already deleted"
            )
