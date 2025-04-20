from typing import List

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.coverage import CoverageSchema
from shared.schemas.core.coverage import Coverage


class CoverageRepository(BaseRepository[CoverageSchema]):
    """Repository for coverage documents using PyMongo."""

    def __init__(self):
        super().__init__("coverages", CoverageSchema)

    def create_coverage(self, coverage: Coverage) -> Coverage:
        """Create a new coverage."""
        coverage_schema = CoverageSchema.from_core(coverage)
        result = self.create(coverage_schema)
        return result.to_core()

    def get_coverages(self, team_id: str) -> List[Coverage]:
        """Get all coverages for a team."""
        coverages = self.find_all({"team": team_id})
        return [coverage.to_core() for coverage in coverages]

    def get_coverage_by_id(self, coverage_id: str) -> Coverage:
        """Get a coverage by its ID."""
        coverage = self.find_by_id(coverage_id)
        if not coverage:
            raise Exception(f"Coverage with id {coverage_id} not found")
        return coverage.to_core()

    def update_coverage(self, coverage: Coverage) -> Coverage:
        """Update a coverage."""
        coverage_schema = CoverageSchema.from_core(coverage)
        coverage_updated = self.update(coverage_schema)
        assert coverage_updated is not None
        return coverage_updated.to_core()

    def delete_coverage(self, coverage_id: str) -> None:
        """Delete a coverage by its ID."""
        result = self.delete(coverage_id)
        if result is False:
            raise Exception(
                f"Coverage with id {coverage_id} not found or already deleted"
            )
