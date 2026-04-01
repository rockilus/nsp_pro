from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Set

from shared.logger import log_error
from shared.schemas.core import (
    MultitaskingGroup,
    MultitaskingGroupType,
    Shift,
    ShiftDemandConcurrency,
    ShiftDemandConcurrencyResponse,
    ShiftDemandNew,
)
from shared.schemas.dto import (
    CreateMultitaskingGroupRequest,
    UpdateMultitaskingGroupRequest,
)

from src.services.base_service import BaseService


@dataclass
class EnrichedDemand:
    """
    Local schema for enriched shift demand with calculated datetimes and unique id.
    """

    demand: ShiftDemandNew
    shift: Shift
    start_datetime: datetime
    end_datetime: datetime
    id: str  # Unique id in the format shift_id-YYYY-MM-DD


# pylint: disable=too-few-public-methods
class MultitaskingService(BaseService):
    """Service for handling shift demand concurrency calculations."""

    def generate_shift_demand_concurrency_list(
        self, team_id: str, start_date: date, end_date: date
    ) -> ShiftDemandConcurrencyResponse:
        """
        Generate concurrency list for shift demands in a given period.

        Filters out demands with count 0 as they don't require staffing.

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

            # Filter out demands with count 0 - no staffing needed
            active_shift_demands = [
                demand for demand in shift_demands if demand.count > 0
            ]

            shifts = self.collection.shift_db.get_shifts_not_deleted(team_id=team_id)
            if not active_shift_demands or not shifts:
                return ShiftDemandConcurrencyResponse(
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    concurrency_list=[],
                )

            # Calculate concurrency based on business rules
            concurrency_list = self._calculate_concurrency(active_shift_demands, shifts)

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

            # Generate unique id: shift_id-YYYY-MM-DD
            id_str = f"{shift.id}-{demand.date.strftime('%Y-%m-%d')}"

            enriched_demands.append(
                EnrichedDemand(
                    demand=demand,
                    shift=shift,
                    start_datetime=start_datetime,
                    end_datetime=end_datetime,
                    id=id_str,
                )
            )

        # Calculate concurrency for all demands
        concurrency_map = self._calculate_concurrency_for_date(enriched_demands)

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
    ) -> Dict[str, Set[str]]:
        """
        Calculate concurrency for enriched demands on the same date.

        For each demand, check all the other overlapping demands and return
        a concurrency map.
        """
        concurrency_map: Dict[str, Set[str]] = {}

        for i, enriched_demand1 in enumerate(demands):
            demand1_id = enriched_demand1.id  # Use enriched id
            if not demand1_id:
                continue  # Skip if id is None

            if demand1_id not in concurrency_map:
                concurrency_map[demand1_id] = set()

            # Check all other demands for overlaps
            for j, enriched_demand2 in enumerate(demands):
                if i == j:  # Skip self-comparison
                    continue

                demand2_id = enriched_demand2.id  # Use enriched id
                if not demand2_id:
                    continue  # Skip if id is None

                if demand2_id not in concurrency_map:
                    concurrency_map[demand2_id] = set()

                # Check if shifts can be worked concurrently
                if self._is_eligible_for_multitasking(
                    enriched_demand1, enriched_demand2
                ):
                    concurrency_map[demand1_id].add(demand2_id)

        return concurrency_map

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

    def _is_eligible_for_multitasking(
        self,
        demand1: EnrichedDemand,
        demand2: EnrichedDemand,
    ) -> bool:
        """
        Returns True if two shifts are eligible for multitasking:
        - They overlap in time
        - They share at least one specialty
        """
        if (
            demand1.demand.id == "684adfd99963edcada794b45"
            and demand2.demand.id == "684adfd99963edcada794b46"
        ):
            print("stop here")
        # 1. Check time overlap
        if not (
            demand1.start_datetime < demand2.end_datetime
            and demand2.start_datetime < demand1.end_datetime
        ):
            return False

        # 2. Check for at least one shared specialty
        specialties1 = set(
            staff.specialty_id for staff in demand1.shift.staffing if staff.staffing > 0
        )
        specialties2 = set(
            staff.specialty_id for staff in demand2.shift.staffing if staff.staffing > 0
        )

        if not specialties1 or not specialties2:
            return False

        # If either set contains None, it means any specialty can do the job
        if None in specialties1 or None in specialties2:
            return True

        if specialties1.isdisjoint(specialties2):
            return False

        return True

    def create_multitasking(
        self, group_data: CreateMultitaskingGroupRequest
    ) -> MultitaskingGroup:
        """Create a new multitasking group."""
        new_group_type = MultitaskingGroupType(group_data.type)
        existing_group = (
            self.collection.multitasking_db.get_group_by_team_type_related_ids(
                team_id=group_data.teamId,
                group_type=new_group_type,
                related_ids=group_data.relatedIds,
                shift_demand_template_id=group_data.shiftDemandTemplateId,
            )
        )
        if existing_group:
            raise ValueError(
                f"Multitasking group with team_id {group_data.teamId}, "
                f"type {group_data.type}, and related_ids {group_data.relatedIds} "
                "already exists."
            )
        group = MultitaskingGroup(
            id=None,
            type=new_group_type,
            team_id=group_data.teamId,
            related_ids=group_data.relatedIds,
            shift_demand_template_id=group_data.shiftDemandTemplateId,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            notes=group_data.notes,
        )
        created = self.collection.multitasking_db.create_group(group)
        return created

    def get_multitaskings(
        self, team_id: str, template_id: Optional[str] = None
    ) -> List[MultitaskingGroup]:
        """Get a multitasking group by ID."""
        if template_id:
            groups = self.collection.multitasking_db.get_groups_by_template_id(
                template_id=template_id
            )
        else:
            groups = self.collection.multitasking_db.get_groups_by_team_id(
                team_id=team_id
            )
        return groups

    def update_multitasking(
        self, update_data: UpdateMultitaskingGroupRequest
    ) -> MultitaskingGroup:
        """Update a multitasking group."""
        group = self.collection.multitasking_db.get_group_by_id(update_data.id)
        if not group:
            raise ValueError(f"Multitasking group with id {update_data.id} not found")
        # Update fields if provided
        if update_data.type is not None:
            group.type = MultitaskingGroupType(update_data.type)
        if update_data.teamId is not None:
            group.team_id = update_data.teamId
        if update_data.relatedIds is not None:
            group.related_ids = update_data.relatedIds
        if update_data.shiftDemandTemplateId is not None:
            group.shift_demand_template_id = update_data.shiftDemandTemplateId
        if update_data.notes is not None:
            group.notes = update_data.notes
        group.updated_at = datetime.now(timezone.utc)
        updated = self.collection.multitasking_db.update_group(group)
        return updated

    def delete_multitasking(self, group_id: str) -> bool:
        """Delete a multitasking group by ID."""
        return self.collection.multitasking_db.delete_group(group_id)
