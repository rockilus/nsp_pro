"""Service for managing assignment swap requests."""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from shared.schemas.core import (
    Assignment,
    ScheduleStatus,
    ShiftType,
    SwapAuditData,
    SwapBid,
    SwapRequest,
    SwapStatus,
    SwapType,
)

from src.services.base_service import BaseService
from src.services.replacement_service import (
    ReplacementService,
)

# pylint: disable=too-many-arguments


class SwapService(BaseService):
    """Service for creating, managing, and executing assignment swaps."""

    def __init__(self, collection, replacement_service: ReplacementService):
        super().__init__(collection)
        self.replacement_service = replacement_service

    def create_swap_request(
        self,
        team_id: str,
        created_by_worker_id: str,
        swap_type: SwapType,
        offered_assignment_ids: List[str],
        comment: str,
        requested_assignment_ids: Optional[List[str]] = None,
        target_worker_id: Optional[str] = None,
    ) -> SwapRequest:
        """
        Create a new swap request.

        Args:
            team_id: Team ID
            created_by_worker_id: Worker creating the swap
            swap_type: DIRECT or OPEN
            offered_assignment_ids: Assignments being offered for swap
            comment: Optional comment about the swap
            requested_assignment_ids: For direct swaps, the requested assignments
            target_worker_id: For direct swaps, the target worker

        Returns:
            Created SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Validate assignments exist and belong to the creator
        offered_assignments = self._validate_and_fetch_assignments(
            offered_assignment_ids, created_by_worker_id, team_id
        )

        # Validate shift types (no campaign schedules, only work shifts)
        self._validate_shift_types(offered_assignments)

        # Get schedule_id (all assignments should be from the same schedule)
        schedule_id = (
            offered_assignments[0].schedule_id if offered_assignments else None
        )

        # For direct swaps, validate the requested assignments
        if swap_type == SwapType.DIRECT:
            if not target_worker_id or not requested_assignment_ids:
                raise ValueError(
                    "Direct swaps require target_worker_id and requested_assignment_ids"
                )

            requested_assignments = self._validate_and_fetch_assignments(
                requested_assignment_ids, target_worker_id, team_id
            )
            self._validate_shift_types(requested_assignments)

            # Validate the swap is feasible
            validation_result = self.replacement_service.validate_assignment_swap(
                worker_a_assignment_ids=offered_assignment_ids,
                worker_b_assignment_ids=requested_assignment_ids,
                team_id=team_id,
            )

            if not validation_result.is_valid:
                raise ValueError(
                    f"Swap validation failed: {validation_result.validation_message}"
                )

        # Create the swap request
        swap_request = SwapRequest(
            id=str(uuid4()),
            team_id=team_id,
            schedule_id=schedule_id,
            created_by_worker_id=created_by_worker_id,
            swap_type=swap_type,
            status=SwapStatus.ACTIVE,
            offered_assignment_ids=offered_assignment_ids,
            requested_assignment_ids=requested_assignment_ids,
            target_worker_id=target_worker_id,
            comment=comment,
            bids=[],
            created_at=datetime.now(timezone.utc),
        )

        # Save to database
        saved_swap = self.collection.swap_db.create_swap_request(swap_request)
        return saved_swap

    def add_bid_to_open_swap(
        self,
        swap_id: str,
        bidder_worker_id: str,
        offered_assignment_ids: List[str],
        team_id: str,
    ) -> SwapRequest:
        """
        Add a bid to an open swap request.

        Args:
            swap_id: Swap request ID
            bidder_worker_id: Worker making the bid
            offered_assignment_ids: Assignments offered in exchange
            team_id: Team ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap is open and active
        if swap.swap_type != SwapType.OPEN:
            raise ValueError("Can only bid on open swaps")
        if swap.status != SwapStatus.ACTIVE:
            raise ValueError(f"Swap is not active (status: {swap.status.value})")

        # Validate bidder is not the creator
        if bidder_worker_id == swap.created_by_worker_id:
            raise ValueError("Cannot bid on your own swap request")

        # Validate offered assignments
        offered_assignments = self._validate_and_fetch_assignments(
            offered_assignment_ids, bidder_worker_id, team_id
        )
        self._validate_shift_types(offered_assignments)

        # Validate the swap would be feasible
        validation_result = self.replacement_service.validate_assignment_swap(
            worker_a_assignment_ids=swap.offered_assignment_ids,
            worker_b_assignment_ids=offered_assignment_ids,
            team_id=team_id,
        )

        if not validation_result.is_valid:
            raise ValueError(
                f"Bid validation failed: {validation_result.validation_message}"
            )

        # Create the bid
        bid = SwapBid(
            id=str(uuid4()),
            worker_id=bidder_worker_id,
            offered_assignment_ids=offered_assignment_ids,
            created_at=datetime.now(timezone.utc),
            accepted=False,
        )

        # Add bid to swap
        swap.bids.append(bid)

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def accept_bid_on_open_swap(self, swap_id: str, bid_id: str) -> SwapRequest:
        """
        Accept a bid on an open swap, moving it to PENDING_APPROVAL status.

        Args:
            swap_id: Swap request ID
            bid_id: Bid ID to accept
            team_id: Team ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap is open and active
        if swap.swap_type != SwapType.OPEN:
            raise ValueError("Can only accept bids on open swaps")
        if swap.status != SwapStatus.ACTIVE:
            raise ValueError(f"Swap is not active (status: {swap.status.value})")

        # Find and accept the bid
        bid = next((b for b in swap.bids if b.id == bid_id), None)
        if not bid:
            raise ValueError(f"Bid {bid_id} not found")

        bid.accepted = True

        # Move swap to pending approval and set the accepted bid as the target
        swap.status = SwapStatus.PENDING_APPROVAL
        swap.target_worker_id = bid.worker_id
        swap.requested_assignment_ids = bid.offered_assignment_ids

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def accept_direct_swap(self, swap_id: str) -> SwapRequest:
        """
        Accept a direct swap invitation, moving it to PENDING_APPROVAL status.

        Args:
            swap_id: Swap request ID
            team_id: Team ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap is direct and active
        if swap.swap_type != SwapType.DIRECT:
            raise ValueError("Can only accept direct swaps")
        if swap.status != SwapStatus.ACTIVE:
            raise ValueError(f"Swap is not active (status: {swap.status.value})")

        # Move to pending approval
        swap.status = SwapStatus.PENDING_APPROVAL

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def approve_swap(self, swap_id: str, approver_user_id: str) -> SwapRequest:
        """
        Approve a swap request and execute the assignment swaps.

        Args:
            swap_id: Swap request ID
            approver_user_id: User ID of the team leader approving
            team_id: Team ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap is pending approval
        if swap.status != SwapStatus.PENDING_APPROVAL:
            raise ValueError(
                f"Swap must be pending approval (current status: {swap.status.value})"
            )

        # Execute the swap
        self._execute_swap(swap)

        # Update swap status
        swap.status = SwapStatus.COMPLETED
        swap.completed_at = datetime.now(timezone.utc)
        swap.completed_by_user_id = approver_user_id

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def cancel_swap(self, swap_id: str) -> SwapRequest:
        """
        Cancel a swap request.

        Args:
            swap_id: Swap request ID
            team_id: Team ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Can only cancel active or pending approval swaps
        if swap.status not in [SwapStatus.ACTIVE, SwapStatus.PENDING_APPROVAL]:
            raise ValueError(f"Cannot cancel swap with status: {swap.status.value}")

        # Update status
        swap.status = SwapStatus.CANCELLED

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def get_swaps_for_team(
        self, team_id: str, status: Optional[SwapStatus] = None
    ) -> List[SwapRequest]:
        """
        Get all swap requests for a team, optionally filtered by status.

        Args:
            team_id: Team ID
            status: Optional status filter

        Returns:
            List of SwapRequest objects
        """
        return self.collection.swap_db.get_swaps_by_team(team_id, status)

    def get_swap_by_id(self, swap_id: str) -> Optional[SwapRequest]:
        """
        Get a swap request by ID.

        Args:
            swap_id: Swap request ID

        Returns:
            SwapRequest or None if not found
        """
        return self.collection.swap_db.get_swap_by_id(swap_id)

    # Private helper methods

    def _validate_and_fetch_assignments(
        self, assignment_ids: List[str], worker_id: str, team_id: str
    ) -> List[Assignment]:
        """Validate assignments exist, belong to the worker, and are from the
        same team."""
        assignments = []
        for assignment_id in assignment_ids:
            assignment = self.collection.assignment_db.get_assignment_by_id(
                assignment_id
            )
            if not assignment:
                raise ValueError(f"Assignment {assignment_id} not found")
            if assignment.worker_id != worker_id:
                raise ValueError(
                    f"Assignment {assignment_id} does not belong to worker {worker_id}"
                )
            if assignment.team_id != team_id:
                raise ValueError(
                    f"Assignment {assignment_id} does not belong to team {team_id}"
                )
            assignments.append(assignment)

        return assignments

    def _validate_shift_types(self, assignments: List[Assignment]) -> None:
        """Validate that assignments are swappable (no campaign schedules,
        only work shifts)."""
        for assignment in assignments:
            # Check schedule status
            if assignment.schedule_id:
                schedule = self.collection.schedule_db.get_schedule_by_id(
                    assignment.schedule_id
                )
                if schedule and schedule.status == ScheduleStatus.CAMPAIGN:
                    raise ValueError("Cannot swap assignments from campaign schedules")

            # Check shift type
            shift = self.collection.shift_db.get_shift_by_id(assignment.shift_id)
            if not shift:
                raise ValueError(f"Shift {assignment.shift_id} not found")

            if shift.shift_type not in [ShiftType.NORMAL, ShiftType.DUTY]:
                raise ValueError(
                    "Can only swap NORMAL or DUTY shifts (found: "
                    + f"{shift.shift_type.value})"
                )

    def _execute_swap(self, swap: SwapRequest) -> None:
        """
        Execute the actual assignment swap, including recuperation assignments.

        This method:
        1. Stores audit data for the original assignments
        2. Swaps the worker_id for all involved assignments
        3. Handles linked recuperation assignments for DUTY shifts
        """
        if not swap.requested_assignment_ids or not swap.target_worker_id:
            raise ValueError("Cannot execute swap without requested assignments")

        # Fetch all assignments
        offered_assignments = [
            self.collection.assignment_db.get_assignment_by_id(aid)
            for aid in swap.offered_assignment_ids
        ]
        requested_assignments = [
            self.collection.assignment_db.get_assignment_by_id(aid)
            for aid in swap.requested_assignment_ids
        ]

        if None in offered_assignments + requested_assignments:
            raise ValueError("One or more assignments in the swap were not found")

        # Build audit data before making changes
        audit_data = []
        for assignment in offered_assignments + requested_assignments:
            if assignment:
                audit_data.append(
                    SwapAuditData(
                        assignment_id=assignment.id,
                        worker_id=assignment.worker_id,
                        shift_id=assignment.shift_id,
                        date_iso=assignment.date.isoformat(),
                    )
                )

        swap.audit_data = audit_data

        # Collect all assignment IDs to swap (including recuperations)
        offered_with_recup = self._collect_assignments_with_recuperations(
            offered_assignments  # type: ignore
        )
        requested_with_recup = self._collect_assignments_with_recuperations(
            requested_assignments  # type: ignore
        )

        creator_worker_id = swap.created_by_worker_id
        target_worker_id = swap.target_worker_id

        # Swap the workers
        for assignment in offered_with_recup:
            assignment.worker_id = target_worker_id
            self.collection.assignment_db.update_assignment(assignment)

        for assignment in requested_with_recup:
            assignment.worker_id = creator_worker_id
            self.collection.assignment_db.update_assignment(assignment)

    def _collect_assignments_with_recuperations(
        self, assignments: List[Assignment]
    ) -> List[Assignment]:
        """Collect assignments and their linked recuperation assignments."""
        all_assignments = []

        for assignment in assignments:
            if assignment:
                all_assignments.append(assignment)

                # Check if this is a DUTY assignment with a recuperation
                shift = self.collection.shift_db.get_shift_by_id(assignment.shift_id)
                if shift and shift.shift_type == ShiftType.DUTY:
                    # Find recuperation assignment
                    recup_assignment = (
                        self.collection.assignment_db.get_assignment_by_reference(
                            assignment.id
                        )
                    )
                    if recup_assignment:
                        all_assignments.append(recup_assignment)

        return all_assignments
