from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Optional, Tuple

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.shift_demand_new import ShiftDemandNewSchema
from shared.schemas.core.shift_demand_new import (
    ShiftDemandCriteria,
    ShiftDemandNew,
    ShiftDemandSource,
)


class ShiftDemandNewRepository(BaseRepository[ShiftDemandNewSchema]):
    """Repository for shift demand new documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "shift_demands_new", ShiftDemandNewSchema)

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

    def get_shift_demands_by_date_range(
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

    def get_shift_demands_by_shift_and_date_range(
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

    def delete_shift_demands_by_shift_id(self, team_id: str, shift_id: str) -> int:
        """
        Delete all shift demands for a specific shift.

        Args:
            team_id: Team identifier
            shift_id: Shift identifier

        Returns:
            Number of demands deleted
        """
        filter_query: Dict[str, Any] = {
            "team": team_id,
            "shift": shift_id,
        }

        result = self.collection.delete_many(filter_query)
        return result.deleted_count

    def bulk_create_shift_demands(
        self, shift_demands: List[ShiftDemandNew]
    ) -> List[ShiftDemandNew]:
        """Create multiple shift demands in bulk."""
        shift_demand_schemas = [
            ShiftDemandNewSchema.from_core(sd) for sd in shift_demands
        ]
        results = self.create_many(shift_demand_schemas)
        return [result.to_core() for result in results]

    def bulk_upsert_shift_demands(
        self, shift_demands: List[ShiftDemandNew]
    ) -> Tuple[List[ShiftDemandNew], List[ShiftDemandNew]]:
        """
        Bulk upsert (create or update) shift demands.

        Args:
            shift_demands: List of shift demands to upsert

        Returns:
            Tuple of (created_demands, updated_demands)
        """
        created_demands: List[ShiftDemandNew] = []
        updated_demands: List[ShiftDemandNew] = []

        for shift_demand in shift_demands:
            if not shift_demand.id or shift_demand.id == "":
                # Create new demand
                result = self.create_shift_demand(shift_demand)
                created_demands.append(result)
            else:
                # Update existing demand
                try:
                    result = self.update_shift_demand(shift_demand)
                    updated_demands.append(result)
                except ValueError:
                    # If update fails, create new (handles race conditions)
                    shift_demand.id = ""  # Clear ID to force creation
                    result = self.create_shift_demand(shift_demand)
                    created_demands.append(result)

        return created_demands, updated_demands

    def delete_demands_by_date_range(
        self,
        team_id: str,
        start_date: date,
        end_date: date,
        shift_ids: Optional[List[str]] = None,
    ) -> int:
        """
        Delete demands within a date range, optionally filtered by shifts.

        Args:
            team_id: Team identifier
            start_date: Start of the period
            end_date: End of the period
            shift_ids: Optional list of shift IDs to filter by

        Returns:
            Number of demands deleted
        """
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()

        filter_query: Dict[str, Any] = {
            "team": team_id,
            "date": {"$gte": start_timestamp, "$lte": end_timestamp},
        }

        if shift_ids:
            filter_query["shift"] = {"$in": shift_ids}

        result = self.collection.delete_many(filter_query)
        return result.deleted_count

    def get_demands_by_source(
        self,
        team_id: str,
        source: ShiftDemandSource,
        source_id: Optional[str] = None,
    ) -> List[ShiftDemandNew]:
        """
        Get demands by source type and optional source ID.

        Args:
            team_id: Team identifier
            source: Source type
            source_id: Optional source ID for tracking

        Returns:
            List of matching shift demands
        """
        filter_query: Dict[str, Any] = {
            "team": team_id,
            "source": source.value,
        }

        if source_id:
            filter_query["source_id"] = source_id

        shift_demands = self.find_all(filter_query)
        return [shift_demand.to_core() for shift_demand in shift_demands]

    def get_shift_demands_by_criteria_batch(
        self, criteria_list: List[ShiftDemandCriteria]
    ) -> List[Optional[ShiftDemandNew]]:
        """
        Get shift demands for multiple criteria in batch.

        Args:
            criteria_list: List of ShiftDemandCriteria with team_id, shift_id,
                          and date

        Returns:
            List of ShiftDemandNew objects (or None) in same order as
            criteria_list. If a criterion has no matching demand, None is
            returned at that position.
        """
        if not criteria_list:
            return []

        # Build OR query to find all matching demands
        or_conditions = []
        for criteria in criteria_list:
            date_timestamp = datetime.combine(
                criteria.date, time.min, timezone.utc
            ).timestamp()
            or_conditions.append(
                {
                    "team": criteria.team_id,
                    "shift": criteria.shift_id,
                    "date": date_timestamp,
                }
            )

        if not or_conditions:
            return []

        # Execute query
        filter_query = {"$or": or_conditions}
        found_demands = self.find_all(filter_query)

        # Create lookup map for found demands
        demand_map: Dict[Tuple[str, str, float], ShiftDemandNew] = {}
        for demand_schema in found_demands:
            demand = demand_schema.to_core()
            key = (
                demand.team_id,
                demand.shift_id,
                datetime.combine(demand.date, time.min, timezone.utc).timestamp(),
            )
            demand_map[key] = demand

        # Return results in same order as input criteria
        results = []
        for criteria in criteria_list:
            date_timestamp = datetime.combine(
                criteria.date, time.min, timezone.utc
            ).timestamp()
            key = (criteria.team_id, criteria.shift_id, date_timestamp)
            results.append(demand_map.get(key))

        return results
