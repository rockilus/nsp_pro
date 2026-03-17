"""
Service layer for shift demand management with enhanced features.
Provides business logic for creating, reading, updating, and deleting shift
demands, including support for period-based operations and matrix formatting.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from shared.schemas.core import (
    ShiftDemandCriteria,
    ShiftDemandNew,
    ShiftDemandSource,
)

from src.services.base_service import BaseService


class ShiftDemandNewService(BaseService):
    """
    Service for managing shift demands with enhanced features.
    Provides business logic for period-based operations, matrix formatting,
    and bulk operations for healthcare scheduling.
    """

    def get_shift_demands_by_period(
        self,
        team_id: str,
        start_date: date,
        end_date: date,
        buffer_days: int = 7,
    ) -> List[ShiftDemandNew]:
        """
        Get shift demands for a specific period with optional buffering.

        Args:
            team_id: Team identifier
            start_date: Start of the period
            end_date: End of the period
            buffer_days: Additional days to fetch before/after period for
                navigation

        Returns:
            List of shift demands for the period
        """
        # Calculate buffered date range for better UX
        buffered_start = start_date - timedelta(days=buffer_days)
        buffered_end = end_date + timedelta(days=buffer_days)

        shifts_not_deleted = self.collection.shift_db.get_shifts_not_deleted(team_id)

        demands_not_filtered = (
            self.collection.shift_demand_new_db.get_shift_demands_by_date_range(
                team_id=team_id,
                start_date=buffered_start,
                end_date=buffered_end,
            )
        )
        # Filter demands to only include those for existing shifts
        shift_ids = {shift.id for shift in shifts_not_deleted}
        filtered_demands = [
            demand for demand in demands_not_filtered if demand.shift_id in shift_ids
        ]
        return filtered_demands

    def get_shift_demands_matrix(
        self,
        team_id: str,
        start_date: date,
        end_date: date,
    ) -> Dict[str, Dict[str, int]]:
        """
        Get shift demands formatted as a matrix for grid display.

        Args:
            team_id: Team identifier
            start_date: Start of the period
            end_date: End of the period

        Returns:
            Nested dictionary: {shift_id: {date_str: count}}
        """
        demands = self.get_shift_demands_by_period(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            buffer_days=0,  # No buffer for matrix display
        )

        # Initialize matrix structure
        matrix: Dict[str, Dict[str, int]] = {}

        # Get all shifts for the team to ensure complete matrix
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id)

        # Initialize matrix with all shifts and dates
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            for shift in shifts:
                if shift.id not in matrix:
                    matrix[shift.id] = {}
                matrix[shift.id][date_str] = 0
            current_date += timedelta(days=1)

        # Fill matrix with actual demand values
        for demand in demands:
            # Only include demands within the exact period (not buffer)
            if start_date <= demand.date <= end_date:
                date_str = demand.date.isoformat()
                if demand.shift_id not in matrix:
                    matrix[demand.shift_id] = {}
                matrix[demand.shift_id][date_str] = demand.count

        return matrix

    def create_shift_demand(self, shift_demand: ShiftDemandNew) -> ShiftDemandNew:
        """
        Create a new shift demand with validation.

        Args:
            shift_demand: Shift demand to create

        Returns:
            Created shift demand

        Raises:
            ValueError: If validation fails
        """
        # Validate shift exists
        shift = self.collection.shift_db.get_shift_by_id(shift_demand.shift_id)
        if not shift:
            raise ValueError(f"Shift with id {shift_demand.shift_id} not found")

        # Validate team consistency
        if shift.team_id != shift_demand.team_id:
            raise ValueError("Shift and demand must belong to the same team")

        # Set creation timestamp
        shift_demand.created_at = datetime.now(timezone.utc)
        shift_demand.updated_at = shift_demand.created_at

        return self.collection.shift_demand_new_db.create_shift_demand(shift_demand)

    def update_shift_demand(
        self, shift_demand: ShiftDemandNew
    ) -> Optional[ShiftDemandNew]:
        """
        Update an existing shift demand.

        Args:
            shift_demand: Updated shift demand

        Returns:
            Updated shift demand

        Raises:
            ValueError: If demand not found or validation fails
        """
        # Validate demand exists
        if not shift_demand.id:
            raise ValueError("Shift demand ID must be provided for update")
        existing = self.collection.shift_demand_new_db.get_shift_demand_by_id(
            shift_demand.id
        )
        if not existing:
            raise ValueError(f"Shift demand with id {shift_demand.id} not found")

        # Validate shift exists
        shift = self.collection.shift_db.get_shift_by_id(shift_demand.shift_id)
        if not shift:
            raise ValueError(f"Shift with id {shift_demand.shift_id} not found")

        # Validate team consistency
        if shift.team_id != shift_demand.team_id:
            raise ValueError("Shift and demand must belong to the same team")

        if shift_demand.count <= 0:
            self.delete_shift_demand(shift_demand.id)
            return None

        # Preserve creation timestamp, update modification timestamp
        shift_demand.created_at = existing.created_at
        shift_demand.updated_at = datetime.now(timezone.utc)

        return self.collection.shift_demand_new_db.update_shift_demand(shift_demand)

    def delete_shift_demand(self, demand_id: str) -> bool:
        """
        Delete a shift demand.

        Args:
            demand_id: ID of demand to delete

        Returns:
            True if deleted successfully
        """
        return self.collection.shift_demand_new_db.delete_shift_demand(demand_id)

    # pylint: disable=too-many-locals, too-many-branches, too-many-statements
    def bulk_upsert_shift_demands(
        self, shift_demands: List[ShiftDemandNew]
    ) -> Tuple[List[ShiftDemandNew], List[ShiftDemandNew], List[str]]:
        """
        Bulk upsert (create or update) shift demands.
        Filters out demands with count=0 for creation and deletes existing
        demands if their count is updated to 0.

        Args:
            shift_demands: List of shift demands to upsert

        Returns:
            Tuple of (created_demands, updated_demands, deleted_ids)
        """
        if not shift_demands:
            return [], [], []

        # Build criteria list for batch lookup (keeps input order)
        criteria_list: List[ShiftDemandCriteria] = [
            ShiftDemandCriteria(team_id=d.team_id, shift_id=d.shift_id, date=d.date)
            for d in shift_demands
        ]

        # Lookup existing demands in a single batch call
        existing_list = (
            self.collection.shift_demand_new_db.get_shift_demands_by_criteria_batch(
                criteria_list
            )
        )

        # Prepare lists for operations
        nonzero_demands: List[ShiftDemandNew] = []
        demands_to_delete: List[str] = []
        # Delete zero-count existing demands; keep nonzero for upsert
        now = datetime.now(timezone.utc)

        # Build a lookup map from existing results so we don't rely on
        # ordering or equal lengths between inputs and repository results.
        existing_map: Dict[Tuple[str, str, date], ShiftDemandNew] = {}
        for ex in existing_list:
            if not ex:
                continue
            key = (ex.team_id, ex.shift_id, ex.date)
            existing_map[key] = ex

        for incoming in shift_demands:
            key = (incoming.team_id, incoming.shift_id, incoming.date)
            existing = existing_map.get(key)

            if incoming.count <= 0:
                # If there is an existing demand for this criteria,
                # collect it for deletion
                if existing and existing.id:
                    demands_to_delete.append(existing.id)
                continue

            # For positive-count demands, if an existing demand is present,
            # preserve id/created_at
            if existing:
                incoming.id = existing.id
                incoming.created_at = existing.created_at
            else:
                # Ensure new demand has no id so repository will create it
                incoming.id = ""
                incoming.created_at = now

            incoming.updated_at = now
            nonzero_demands.append(incoming)

        # Bulk delete all demands that need to be removed
        if demands_to_delete:
            self.collection.shift_demand_new_db.delete_shift_demands_by_ids(
                demands_to_delete
            )

        # If there are no demands to create/update, return
        if not nonzero_demands:
            return [], [], demands_to_delete

        # Validate all nonzero demands belong to the same team
        team_ids = {demand.team_id for demand in nonzero_demands}
        if len(team_ids) > 1:
            raise ValueError("All demands must belong to the same team")

        team_id = next(iter(team_ids))

        # Validate all shifts exist and belong to the team
        shift_ids = {demand.shift_id for demand in nonzero_demands}
        shifts = self.collection.shift_db.get_shifts_by_ids(list(shift_ids))

        if len(shifts) != len(shift_ids):
            found_shift_ids = {shift.id for shift in shifts}
            missing = shift_ids - found_shift_ids
            raise ValueError(f"Shifts not found: {missing}")

        for shift in shifts:
            if shift.team_id != team_id:
                raise ValueError(f"Shift {shift.id} does not belong to team {team_id}")

        # Separate demands into create vs update operations
        demands_to_create: List[ShiftDemandNew] = []
        demands_to_update: List[ShiftDemandNew] = []

        for demand in nonzero_demands:
            key = (demand.team_id, demand.shift_id, demand.date)
            existing = existing_map.get(key)

            if existing:
                # Demand exists in database, needs update
                demands_to_update.append(demand)
            else:
                # Demand doesn't exist in database, needs creation
                demands_to_create.append(demand)

        # Perform bulk create for new demands
        created: List[ShiftDemandNew] = []
        if demands_to_create:
            created = self.collection.shift_demand_new_db.bulk_create_shift_demands(
                demands_to_create
            )

        # Perform individual updates for existing demands
        updated: List[ShiftDemandNew] = []
        for demand in demands_to_update:
            updated_demand = self.collection.shift_demand_new_db.update_shift_demand(
                demand
            )
            updated.append(updated_demand)

        return created, updated, demands_to_delete

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    # pylint: disable=too-many-locals
    def copy_shift_demands_from_period(
        self,
        team_id: str,
        source_start: date,
        source_end: date,
        target_start: date,
        target_end: date,
        source_type: ShiftDemandSource = ShiftDemandSource.TEMPLATE,
    ) -> List[ShiftDemandNew]:
        """
        Copy shift demands from one period to another.
        Useful for applying templates or duplicating successful periods.

        Args:
            team_id: Team identifier
            source_start: Start of source period
            source_end: End of source period
            target_start: Start of target period
            target_end: End of target period
            source_type: Source type for tracking copied demands

        Returns:
            List of created shift demands
        """
        # Get source demands
        source_demands = (
            self.collection.shift_demand_new_db.get_shift_demands_by_date_range(
                team_id=team_id,
                start_date=source_start,
                end_date=source_end,
            )
        )

        if not source_demands:
            return []

        # Calculate date mapping
        # source_days = (source_end - source_start).days + 1
        target_days = (target_end - target_start).days + 1

        copied_demands: List[ShiftDemandNew] = []
        now = datetime.now(timezone.utc)

        for source_demand in source_demands:
            # Calculate relative position in source period
            days_from_start = (source_demand.date - source_start).days

            # Map to target period (cycle if target is longer)
            target_day_offset = days_from_start % target_days
            target_date = target_start + timedelta(days=target_day_offset)

            # Create copied demand
            copied_demand = ShiftDemandNew(
                id="",  # Will be generated
                team_id=team_id,
                shift_id=source_demand.shift_id,
                date=target_date,
                count=source_demand.count,
                source=source_type,
                source_id=source_demand.id,  # Track original demand
                created_at=now,
                updated_at=now,
            )

            copied_demands.append(copied_demand)

        # Bulk create copied demands
        if copied_demands:
            created, _, _ = self.bulk_upsert_shift_demands(copied_demands)
            return created

        return []

    def prefetch_for_navigation(
        self,
        team_id: str,
        current_start: date,
        current_end: date,
        prefetch_periods: int = 2,
    ) -> None:
        """
        Prefetch shift demands for adjacent periods to improve navigation UX.
        This could be used with caching systems in the future.

        Args:
            team_id: Team identifier
            current_start: Start of current period
            current_end: End of current period
            prefetch_periods: Number of periods to prefetch in each direction
        """
        period_length = (current_end - current_start).days + 1

        # Prefetch previous periods
        for i in range(1, prefetch_periods + 1):
            prefetch_start = current_start - timedelta(days=period_length * i)
            prefetch_end = current_end - timedelta(days=period_length * i)

            # Just trigger the query to populate any caches
            self.get_shift_demands_by_period(
                team_id=team_id,
                start_date=prefetch_start,
                end_date=prefetch_end,
                buffer_days=0,
            )

        # Prefetch next periods
        for i in range(1, prefetch_periods + 1):
            prefetch_start = current_start + timedelta(days=period_length * i)
            prefetch_end = current_end + timedelta(days=period_length * i)

            # Just trigger the query to populate any caches
            self.get_shift_demands_by_period(
                team_id=team_id,
                start_date=prefetch_start,
                end_date=prefetch_end,
                buffer_days=0,
            )

    def get_team_shift_summary(
        self,
        team_id: str,
        start_date: date,
        end_date: date,
    ) -> Dict[str, Dict[str, int]]:
        """
        Get summary statistics for shift demands by shift.

        Args:
            team_id: Team identifier
            start_date: Start of the period
            end_date: End of the period

        Returns:
            Dictionary with shift statistics: {shift_id: {total: X,
            days_with_demand: Y, avg_per_day: Z}}
        """
        demands = self.get_shift_demands_by_period(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            buffer_days=0,
        )

        # Filter to exact period
        period_demands = []
        for d in demands:
            if start_date <= d.date <= end_date:
                period_demands.append(d)

        # Calculate statistics by shift
        shift_stats: Dict[str, Dict[str, int]] = {}

        for demand in period_demands:
            shift_id = demand.shift_id
            if shift_id not in shift_stats:
                shift_stats[shift_id] = {
                    "total": 0,
                    "days_with_demand": 0,
                    "max_per_day": 0,
                }

            shift_stats[shift_id]["total"] += demand.count
            if demand.count > 0:
                shift_stats[shift_id]["days_with_demand"] += 1
                shift_stats[shift_id]["max_per_day"] = max(
                    shift_stats[shift_id]["max_per_day"], demand.count
                )

        # Calculate averages
        total_days = (end_date - start_date).days + 1
        for shift_id, stats in shift_stats.items():
            if total_days > 0:
                stats["avg_per_day"] = int(round(stats["total"] / total_days, 0))
            else:
                stats["avg_per_day"] = 0

        return shift_stats

    def get_demands_by_shift_and_date_range(
        self,
        team_id: str,
        shift_id: str,
        start_date: date,
        end_date: date,
    ) -> List[ShiftDemandNew]:
        """
        Get demands for a specific shift within a date range.

        Args:
            team_id: Team identifier
            shift_id: Shift identifier
            start_date: Start of the period
            end_date: End of the period

        Returns:
            List of shift demands for the shift and period
        """
        # fmt: off
        return self.collection.shift_demand_new_db\
            .get_shift_demands_by_shift_and_date_range(
                team_id=team_id,
                shift_id=shift_id,
                start_date=start_date,
                end_date=end_date,
            )
        # fmt: on

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
        return self.collection.shift_demand_new_db.delete_demands_by_date_range(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            shift_ids=shift_ids,
        )

    def get_demands_by_source(
        self,
        team_id: str,
        source: ShiftDemandSource,
        source_id: Optional[str] = None,
    ) -> List[ShiftDemandNew]:
        """
        Get demands by source type and optional source ID.
        Useful for finding demands created from templates or duplication.

        Args:
            team_id: Team identifier
            source: Source type
            source_id: Optional source ID for tracking

        Returns:
            List of matching shift demands
        """
        return self.collection.shift_demand_new_db.get_demands_by_source(
            team_id=team_id,
            source=source,
            source_id=source_id,
        )

    def get_shift_demand_by_id(self, demand_id: str) -> Optional[ShiftDemandNew]:
        """
        Get a shift demand by its ID.

        Args:
            demand_id: ID of the shift demand

        Returns:
            ShiftDemandNew instance if found, None otherwise
        """
        return self.collection.shift_demand_new_db.get_shift_demand_by_id(demand_id)
