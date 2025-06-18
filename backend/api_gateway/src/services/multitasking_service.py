from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Set

from shared.logger import log_error
from shared.schemas.core import (
    Shift,
    ShiftDemandConcurrency,
    ShiftDemandConcurrencyResponse,
    ShiftDemandNew,
)

from src.services.base_service import BaseService


@dataclass
class EnrichedDemand:
    """Local schema for enriched shift demand with calculated datetimes."""

    demand: ShiftDemandNew
    shift: Shift
    start_datetime: datetime
    end_datetime: datetime


# pylint: disable=too-few-public-methods
class MultitaskingService(BaseService):
    """Service for handling shift demand concurrency calculations."""

    def generate_shift_demand_concurrency_list(
        self, team_id: str, start_date: date, end_date: date
    ) -> ShiftDemandConcurrencyResponse:
        """
        Generate concurrency list for shift demands in a given period.

        Args:
            team_id: The team ID
            start_date: Start date of the period
            end_date: End date of the period

        Returns:
            ShiftDemandConcurrencyResponse with concurrency data
        """
        try:
            # Get all shift demands for the period
            shift_demands = (
                self.collection.shift_demand_new_db.get_shift_demands_by_date_range(
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            shifts = self.collection.shift_db.get_shifts_not_deleted(team_id=team_id)
            if not shift_demands or not shifts:
                return ShiftDemandConcurrencyResponse(
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    concurrency_list=[],
                )

            # Calculate concurrency based on business rules
            concurrency_list = self._calculate_concurrency(shift_demands, shifts)

            return ShiftDemandConcurrencyResponse(
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
                concurrency_list=concurrency_list,
            )

        except Exception as e:
            log_error(f"Error generating concurrency list: {e}")
            raise

    # pylint: disable=too-many-locals
    def _calculate_concurrency(
        self, shift_demands: List[ShiftDemandNew], shifts: List[Shift]
    ) -> List[ShiftDemandConcurrency]:
        """
        Calculate which shift demands can be worked concurrently.

        Business rules for concurrency:
        1. Shifts must be on the same date
        2. Shifts must not have overlapping time periods
        3. Shifts must not require conflicting specialties (if applicable)
        """
        concurrency_map: Dict[str, Set[str]] = {}

        # Create a mapping from shift_id to shift for quick lookup
        shift_map = {shift.id: shift for shift in shifts}

        # Create enriched shift demands with calculated start/end datetime
        enriched_demands: List[EnrichedDemand] = []
        for demand in shift_demands:
            shift = shift_map.get(demand.shift_id, None)
            if not shift:
                continue  # Skip if shift not found

            # Calculate start and end datetime for this shift demand
            start_datetime = self._combine_date_and_time(demand.date, shift.start_time)
            end_datetime = self._combine_date_and_time(demand.date, shift.end_time)

            # Handle overnight shifts - if end time is before start time,
            # add one day
            if end_datetime <= start_datetime:
                end_datetime = end_datetime.replace(day=end_datetime.day + 1)

            enriched_demands.append(
                EnrichedDemand(
                    demand=demand,
                    shift=shift,
                    start_datetime=start_datetime,
                    end_datetime=end_datetime,
                )
            )

        # Group enriched demands by date for efficient comparison
        demands_by_date: Dict[str, List[EnrichedDemand]] = {}
        for enriched_demand in enriched_demands:
            date_key = enriched_demand.demand.date.isoformat()
            if date_key not in demands_by_date:
                demands_by_date[date_key] = []
            demands_by_date[date_key].append(enriched_demand)

        # Calculate concurrency for each date
        for date_demands in demands_by_date.values():
            self._calculate_concurrency_for_date(date_demands, concurrency_map)

        # Convert to ShiftDemandConcurrency objects
        result: List[ShiftDemandConcurrency] = []
        for demand_id, concurrent_ids in concurrency_map.items():
            result.append(
                ShiftDemandConcurrency(
                    shift_demand_id=demand_id,
                    concurrent_shift_demand_ids=list(concurrent_ids),
                )
            )

        return result

    def _calculate_concurrency_for_date(
        self,
        demands: List[EnrichedDemand],
        concurrency_map: Dict[str, Set[str]],
    ) -> None:
        """Calculate concurrency for enriched demands on the same date."""
        for i, enriched_demand1 in enumerate(demands):
            demand1_id = enriched_demand1.demand.id
            if not demand1_id:
                continue  # Skip if demand ID is None

            if demand1_id not in concurrency_map:
                concurrency_map[demand1_id] = set()

            for enriched_demand2 in demands[i + 1 :]:
                demand2_id = enriched_demand2.demand.id
                if not demand2_id:
                    continue  # Skip if demand ID is None

                if demand2_id not in concurrency_map:
                    concurrency_map[demand2_id] = set()

                # Check if shifts can be worked concurrently
                if self._can_work_concurrently_enriched(
                    enriched_demand1, enriched_demand2
                ):
                    concurrency_map[demand1_id].add(demand2_id)
                    concurrency_map[demand2_id].add(demand1_id)

    def _can_work_concurrently_enriched(
        self,
        enriched_demand1: EnrichedDemand,
        enriched_demand2: EnrichedDemand,
    ) -> bool:
        """
        Determine if two enriched shift demands can be worked concurrently.

        Returns True if shifts:
        1. Don't overlap in time
        2. Don't have conflicting specialties
        """
        # Check time overlap using calculated datetime objects
        if self._datetimes_overlap(
            enriched_demand1.start_datetime,
            enriched_demand1.end_datetime,
            enriched_demand2.start_datetime,
            enriched_demand2.end_datetime,
        ):
            return False

        # Check specialty conflicts (if applicable)
        shift1_staffing = enriched_demand1.shift.staffing
        shift2_staffing = enriched_demand2.shift.staffing

        if self._have_staffing_conflicts(shift1_staffing, shift2_staffing):
            return False

        return True

    def _datetimes_overlap(
        self,
        start1: datetime,
        end1: datetime,
        start2: datetime,
        end2: datetime,
    ) -> bool:
        """Check if two datetime periods overlap."""
        # Two periods overlap if one starts before the other ends
        # and the other starts before the first one ends
        return start1 < end2 and start2 < end1

    def _have_staffing_conflicts(
        self, staffing1: List[Any], staffing2: List[Any]
    ) -> bool:
        """
        Check if staffing requirements conflict.

        This method should be implemented based on specific business rules
        about which specialties can or cannot be worked together.
        For now, we assume no conflicts.
        """
        # Placeholder - implement based on business requirements
        # Could check if both shifts require the same specialty
        # or if there are mutual exclusions
        # Currently unused parameters will be used when logic is implemented
        _ = staffing1, staffing2
        return False

    def _combine_date_and_time(self, date_obj: date, time_obj: datetime) -> datetime:
        """
        Combine a date object with the time from a datetime object.

        Args:
            date_obj: The date to use
            time_obj: The datetime object to extract time from

        Returns:
            A datetime object combining the date and time
        """
        return datetime.combine(date_obj, time_obj.time(), tzinfo=timezone.utc)
