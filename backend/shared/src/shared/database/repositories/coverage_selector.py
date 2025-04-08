from typing import List

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.coverage_selector import (
    CoverageSelectorSchema,
)
from shared.schemas.schemas.coverage_selector import CoverageSelector


class CoverageSelectorRepository(BaseRepository[CoverageSelectorSchema]):
    """Repository for coverage selector documents using PyMongo."""

    def __init__(self):
        super().__init__("coverage_selectors", CoverageSelectorSchema)

    def create_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        """Create a new coverage selector."""
        cs_schema = CoverageSelectorSchema.from_core(coverage_selector)
        result = self.create(cs_schema)
        return result.to_core()

    def get_coverage_selectors(self, schedule_id: str) -> List[CoverageSelector]:
        """Get all coverage selectors for a schedule."""
        selectors = self.find_all({"schedule": schedule_id})
        return [selector.to_core() for selector in selectors]

    def get_coverage_selector_by_id(
        self, coverage_selector_id: str
    ) -> CoverageSelector:
        """Get a coverage selector by its ID."""
        selector = self.find_by_id(coverage_selector_id)
        if not selector:
            raise Exception(
                f"Coverage selector with id {coverage_selector_id} not found"
            )
        return selector.to_core()

    def get_coverage_selectors_by_schedule_id_full_period(
        self, schedule_id: str
    ) -> List[CoverageSelector]:
        """Get all coverage selectors for a schedule with full period."""
        selectors = self.find_all({"schedule": schedule_id, "full_period": True})
        return [selector.to_core() for selector in selectors]

    def get_coverage_selectors_by_coverage_id(
        self, coverage_id: str
    ) -> List[CoverageSelector]:
        """Get all coverage selectors for a coverage ID."""
        selectors = self.find_all({"coverage": coverage_id})
        return [selector.to_core() for selector in selectors]

    def update_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        """Update a coverage selector."""
        cs_schema = CoverageSelectorSchema.from_core(coverage_selector)
        selector_updated = self.update(cs_schema)
        assert selector_updated is not None
        return selector_updated.to_core()

    def update_coverage_selectors(
        self, coverage_selectors: List[CoverageSelector]
    ) -> List[CoverageSelector]:
        """Update multiple coverage selectors."""
        if not coverage_selectors:
            return []

        updated_selectors = []
        for selector in coverage_selectors:
            updated = self.update_coverage_selector(selector)
            updated_selectors.append(updated)

        return updated_selectors

    def delete_coverage_selector(self, coverage_selector_id: str) -> None:
        """Delete a coverage selector by its ID."""
        result = self.delete(coverage_selector_id)
        if result is False:
            raise Exception(
                f"Coverage selector with id {coverage_selector_id} not found or "
                + "already deleted"
            )

    def delete_coverage_selectors_by_coverage_id(self, coverage_id: str) -> None:
        """Delete all coverage selectors associated with a coverage ID."""
        self.collection.delete_many({"coverage": coverage_id})
