from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Optional

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.shift_demand_new import ShiftDemandNewSchema
from shared.schemas.core.shift_demand_new import ShiftDemandNew


class ShiftDemandNewRepository(BaseRepository[ShiftDemandNewSchema]):
    """Repository for shift demand new documents using PyMongo."""

    def __init__(self):
        super().__init__("shift_demands_new", ShiftDemandNewSchema)

    def create_shift_demand(self, shift_demand: ShiftDemandNew) -> ShiftDemandNew:
        """Create a new shift demand."""
        shift_demand_schema = ShiftDemandNewSchema.from_core(shift_demand)
        result = self.create(shift_demand_schema)
        return result.to_core()

    def get_shift_demand_by_id(self, shift_demand_id: str) -> Optional[ShiftDemandNew]:
        """Get a shift demand by its ID."""
        shift_demand = self.find_by_id(shift_demand_id)
        if not shift_demand:
            return None
        return shift_demand.to_core()

    def get_shift_demands_by_team_id(self, team_id: str) -> List[ShiftDemandNew]:
        """Get all shift demands for a team."""
        shift_demands = self.find_all({"team": team_id})
        return [shift_demand.to_core() for shift_demand in shift_demands]

    def get_shift_demands_by_team_and_date_range(
        self, team_id: str, start_date: date, end_date: date
    ) -> List[ShiftDemandNew]:
        """Get shift demands for a team within a date range."""
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()

        filter_query: Dict[str, Any] = {
            "team": team_id,
            "date": {"$gte": start_timestamp, "$lte": end_timestamp},
        }

        shift_demands = self.find_all(filter_query)
        return [shift_demand.to_core() for shift_demand in shift_demands]

    def get_shift_demands_by_team_shift_and_date_range(
        self, team_id: str, shift_id: str, start_date: date, end_date: date
    ) -> List[ShiftDemandNew]:
        """Get shift demands for a specific team/shift within a date range."""
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()

        filter_query: Dict[str, Any] = {
            "team": team_id,
            "shift": shift_id,
            "date": {"$gte": start_timestamp, "$lte": end_timestamp},
        }

        shift_demands = self.find_all(filter_query)
        return [shift_demand.to_core() for shift_demand in shift_demands]

    def update_shift_demand(self, shift_demand: ShiftDemandNew) -> ShiftDemandNew:
        """Update a shift demand."""
        shift_demand_schema = ShiftDemandNewSchema.from_core(shift_demand)
        shift_demand_updated = self.update(shift_demand_schema)
        if not shift_demand_updated:
            raise ValueError(f"Failed to update shift demand with id {shift_demand.id}")
        return shift_demand_updated.to_core()

    def delete_shift_demand(self, shift_demand_id: str) -> bool:
        """Delete a shift demand by its ID."""
        return self.delete(shift_demand_id)

    def bulk_create_shift_demands(
        self, shift_demands: List[ShiftDemandNew]
    ) -> List[ShiftDemandNew]:
        """Create multiple shift demands in bulk."""
        shift_demand_schemas = [
            ShiftDemandNewSchema.from_core(sd) for sd in shift_demands
        ]
        results = self.create_many(shift_demand_schemas)
        return [result.to_core() for result in results]

    def delete_shift_demands_by_team_and_date_range(
        self, team_id: str, start_date: date, end_date: date
    ) -> int:
        """Delete shift demands for a team within a date range."""
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()

        filter_query: Dict[str, Any] = {
            "team": team_id,
            "date": {"$gte": start_timestamp, "$lte": end_timestamp},
        }

        result = self.collection.delete_many(filter_query)
        return result.deleted_count

    def upsert_shift_demand(
        self,
        team_id: str,
        shift_id: str,
        demand_date: date,
        shift_demand: ShiftDemandNew,
    ) -> ShiftDemandNew:
        """Upsert a shift demand - update if exists, create if not."""
        date_timestamp = datetime.combine(
            demand_date, time.min, timezone.utc
        ).timestamp()

        filter_query: Dict[str, Any] = {
            "team": team_id,
            "shift": shift_id,
            "date": date_timestamp,
        }

        existing = self.find_one(filter_query)
        if existing:
            # Update existing
            shift_demand.id = existing.id
            return self.update_shift_demand(shift_demand)
        # Create new
        return self.create_shift_demand(shift_demand)
