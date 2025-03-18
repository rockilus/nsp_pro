from typing import List

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.stats_header import StatsHeaderSchema
from shared.schemas.schemas.stats import (
    HeaderUnitOptions,
    StatsHeader,
    StatsUnitOptions,
)


class StatsHeaderRepository(BaseRepository[StatsHeaderSchema]):
    """Repository for stats header documents using PyMongo."""

    def __init__(self):
        super().__init__("stats_headers", StatsHeaderSchema)

    def create_stats_header(self, stats_header: StatsHeader) -> StatsHeader:
        """Create a new stats header."""
        stats_header_schema = StatsHeaderSchema.from_core(stats_header)
        result = self.create(stats_header_schema)
        return result.to_core()

    def get_stats_headers_by_team_id(self, team_id: str) -> List[StatsHeader]:
        """Get all stats headers for a team."""
        stats_headers = self.find_all({"team": ObjectId(team_id)})
        return [sh.to_core() for sh in stats_headers]

    def get_stats_headers_by_team_unit_shifts(
        self,
        team_id: str,
        stats_unit: StatsUnitOptions,
        header_unit: HeaderUnitOptions,
    ) -> List[StatsHeader]:
        """Get all stats headers for a team by unit and shifts."""
        stats_headers = self.find_all(
            {
                "team": ObjectId(team_id),
                "stats_unit": stats_unit.value,
                "header_unit": header_unit.value,
            }
        )
        return [sh.to_core() for sh in stats_headers]

    def update_stats_header(self, stats_header: StatsHeader) -> StatsHeader:
        """Update a stats header."""
        stats_header_schema = StatsHeaderSchema.from_core(stats_header)
        stats_header_updated = self.update(stats_header_schema)
        assert stats_header_updated is not None
        return stats_header_updated.to_core()

    def delete_stats_header(self, stats_header_id: str) -> None:
        """Delete a stats header by its ID."""
        result = self.delete(stats_header_id)
        if result is False:
            raise Exception(
                f"StatsHeader with id {stats_header_id} not found or already deleted"
            )
