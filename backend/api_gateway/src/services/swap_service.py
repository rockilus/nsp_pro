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
        created_by_user_id: str,
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
            created_by_user_id: User ID of the person creating the swap
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
        # Validate assignments exist and get the creator from the first assignment
        offered_assignments = (
            self.collection.assignment_db.get_assignments_by_ids(
                assignment_ids=offered_assignment_ids
            )
        )

        if not offered_assignments or len(offered_assignments) != len(
            offered_assignment_ids
        ):
            raise ValueError("Some offered assignments not found")

        # Get the worker ID from the first assignment
        created_by_worker_id = offered_assignments[0].worker_id

        # Validate all assignments belong to the same worker
        if not all(
            a.worker_id == created_by_worker_id for a in offered_assignments
        ):
            raise ValueError(
                "All offered assignments must belong to the same worker"
            )

        # Validate all assignments belong to the team
        if not all(a.team_id == team_id for a in offered_assignments):
            raise ValueError("All offered assignments must belong to the team")

        # Validate shift types (no campaign schedules, only work shifts)
        self._validate_shift_types(offered_assignments)

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

        # Create the swap request
        swap_request = SwapRequest(
            id=str(uuid4()),
            team_id=team_id,
            created_by_user_id=created_by_user_id,
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
            raise ValueError(
                f"Swap is not active (status: {swap.status.value})"
            )

        # Get creator worker ID from offered assignments
        offered_assignments_for_creator = (
            self.collection.assignment_db.get_assignments_by_ids(
                assignment_ids=swap.offered_assignment_ids
            )
        )
        if not offered_assignments_for_creator:
            raise ValueError("Offered assignments not found")
        creator_worker_id = offered_assignments_for_creator[0].worker_id

        # Validate bidder is not the creator
        if bidder_worker_id == creator_worker_id:
            raise ValueError("Cannot bid on your own swap request")

        # Validate offered assignments
        offered_assignments = self._validate_and_fetch_assignments(
            offered_assignment_ids, bidder_worker_id, team_id
        )
        self._validate_shift_types(offered_assignments)

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

    def accept_bid_on_open_swap(
        self, swap_id: str, bid_id: str
    ) -> SwapRequest:
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
            raise ValueError(
                f"Swap is not active (status: {swap.status.value})"
            )

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

    def cancel_bid_acceptance(self, swap_id: str) -> SwapRequest:
        """
        Cancel bid acceptance, returning swap to ACTIVE status.
        Resets the accepted bid and allows creator to choose again.

        Args:
            swap_id: Swap request ID

        Returns:
            Updated SwapRequest

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap type and status
        if swap.swap_type != SwapType.OPEN:
            raise ValueError("Can only cancel bid acceptance on open swaps")
        if swap.status != SwapStatus.PENDING_APPROVAL:
            raise ValueError(
                f"Can only cancel acceptance from PENDING_APPROVAL status "
                f"(current: {swap.status.value})"
            )

        # Find and reset the accepted bid
        for bid in swap.bids:
            if bid.accepted:
                bid.accepted = False

        # Reset swap to active state
        swap.status = SwapStatus.ACTIVE
        swap.target_worker_id = None
        swap.requested_assignment_ids = None

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def delete_bid(
        self, swap_id: str, bid_id: str, deleter_worker_id: str
    ) -> SwapRequest:
        """
        Delete a bid from an open swap request.

        Args:
            swap_id: Swap request ID
            bid_id: Bid ID to delete
            deleter_worker_id: Worker ID of the user deleting the bid

        Returns:
            Updated SwapRequest without the deleted bid

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Validate swap is open and active
        if swap.swap_type != SwapType.OPEN:
            raise ValueError("Can only delete bids from open swaps")
        if swap.status != SwapStatus.ACTIVE:
            raise ValueError(
                f"Can only delete bids from active swaps (status: {swap.status.value})"
            )

        # Find the bid
        bid = next((b for b in swap.bids if b.id == bid_id), None)
        if not bid:
            raise ValueError(f"Bid {bid_id} not found")

        # Validate bid is not accepted
        if bid.accepted:
            raise ValueError("Cannot delete an accepted bid")

        # Validate the deleter is the bid owner
        if bid.worker_id != deleter_worker_id:
            raise ValueError("You can only delete your own bids")

        # Remove the bid
        swap.bids = [b for b in swap.bids if b.id != bid_id]

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
            raise ValueError(
                f"Swap is not active (status: {swap.status.value})"
            )

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

    def delete_swap(self, swap_id: str) -> None:
        """
        Delete a swap request from the database.

        Args:
            swap_id: Swap request ID

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Can only delete active or pending approval swaps
        if swap.status not in [SwapStatus.ACTIVE, SwapStatus.PENDING_APPROVAL]:
            raise ValueError(
                f"Cannot delete swap with status: {swap.status.value}"
            )

        # Delete from database
        self.collection.swap_db.delete_swap_request(swap_id)

    def deny_swap(self, swap_id: str, denier_user_id: str) -> SwapRequest:
        """
        Deny a swap request (leader only, during pending approval).

        Args:
            swap_id: Swap request ID
            denier_user_id: User ID of the leader denying the swap

        Returns:
            Updated SwapRequest with DENIED status

        Raises:
            ValueError: If validation fails
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Can only deny pending approval swaps
        if swap.status != SwapStatus.PENDING_APPROVAL:
            raise ValueError(
                f"Cannot deny swap with status: {swap.status.value}. "
                "Only PENDING_APPROVAL swaps can be denied."
            )

        # Update status
        swap.status = SwapStatus.DENIED
        swap.completed_at = datetime.now(timezone.utc)
        swap.completed_by_user_id = denier_user_id

        # Update in database
        updated_swap = self.collection.swap_db.update_swap_request(swap)
        return updated_swap

    def revert_swap(self, swap_id: str, reverter_user_id: str) -> SwapRequest:
        """
        Revert a completed swap, restoring assignments to original workers.

        Args:
            swap_id: Swap request ID
            reverter_user_id: User ID of the leader reverting the swap

        Returns:
            Updated SwapRequest with REVERTED status

        Raises:
            ValueError: If validation fails or audit data is missing
        """
        # Fetch swap request
        swap = self.collection.swap_db.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Can only revert completed swaps
        if swap.status != SwapStatus.COMPLETED:
            raise ValueError(
                f"Cannot revert swap with status: {swap.status.value}. "
                "Only COMPLETED swaps can be reverted."
            )

        # Verify audit data exists
        if not swap.audit_data:
            raise ValueError(
                f"Cannot revert swap {swap_id}: no audit data available"
            )

        # Build map of assignment ID to original worker ID
        audit_map = {
            audit.assignment_id: audit.worker_id for audit in swap.audit_data
        }

        # Fetch all assignments from audit data
        assignment_ids = list(audit_map.keys())
        assignments = self.collection.assignment_db.get_assignments_by_ids(
            assignment_ids=assignment_ids
        )

        if not assignments:
            raise ValueError(
                f"Cannot revert swap {swap_id}: assignments not found"
            )

        # Restore original worker IDs for all assignments
        for assignment in assignments:
            if assignment.id in audit_map:
                original_worker_id = audit_map[assignment.id]
                assignment.worker_id = original_worker_id
                self.collection.assignment_db.update_assignment(assignment)

                # Handle recuperation assignments for DUTY shifts
                shift = self.collection.shift_db.get_shift_by_id(
                    assignment.shift_id
                )
                if shift and shift.shift_type == ShiftType.DUTY:
                    # Find recuperation assignment linked to this assignment
                    recup = self.collection.assignment_db.get_assignment_by_reference(
                        assignment.id
                    )
                    if recup:
                        recup.worker_id = original_worker_id
                        self.collection.assignment_db.update_assignment(recup)

        # Update swap status and metadata
        swap.status = SwapStatus.REVERTED
        swap.reverted_at = datetime.now(timezone.utc)
        swap.reverted_by_user_id = reverter_user_id

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
                    raise ValueError(
                        "Cannot swap assignments from campaign schedules"
                    )

            # Check shift type
            shift = self.collection.shift_db.get_shift_by_id(
                assignment.shift_id
            )
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
            raise ValueError(
                "Cannot execute swap without requested assignments"
            )

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
            raise ValueError(
                "One or more assignments in the swap were not found"
            )

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

        # Get creator worker ID from offered assignments
        offered_worker_id_set = {a.worker_id for a in offered_assignments if a}
        if len(offered_worker_id_set) != 1:
            raise ValueError("Offered assignments belong to multiple workers")
        creator_worker_id = offered_worker_id_set.pop()
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
                shift = self.collection.shift_db.get_shift_by_id(
                    assignment.shift_id
                )
                if shift and shift.shift_type == ShiftType.DUTY:
                    # Find recuperation assignment
                    recup_assignment = self.collection.assignment_db.get_assignment_by_reference(
                        assignment.id
                    )
                    if recup_assignment:
                        all_assignments.append(recup_assignment)

        return all_assignments
