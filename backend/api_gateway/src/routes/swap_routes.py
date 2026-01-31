"""Routes for assignment swap operations."""

from typing import Optional

from fastapi import APIRouter, Depends
from shared.logger import log_info
from shared.schemas.core import SwapStatus, SwapType
from shared.schemas.dto import CreateSwapRequestDTO, SwapRequestDTO

from src.dependencies import get_swap_service, get_user_context
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.swap_service import SwapService

router = APIRouter()

# pylint: disable=too-many-arguments


@router.post("/swaps/teams/{team_id}", status_code=201)
async def create_swap_request(
    team_id: str,
    swap_request: CreateSwapRequestDTO,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Create a new swap request."""
    try:
        # Check permission
        if not await authz_check(user_context.user_id, "create-swap", "team", team_id):
            raise NotAuthorizedError(
                "You do not have permission to create a swap request"
            )

        # Parse swap type
        swap_type = SwapType(swap_request.swapType)

        # Create the swap request
        created_swap = swap_service.create_swap_request(
            team_id=team_id,
            created_by_user_id=user_context.user_id,
            swap_type=swap_type,
            offered_assignment_ids=swap_request.offeredAssignmentIds,
            comment=swap_request.comment,
            requested_assignment_ids=swap_request.requestedAssignmentIds,
            target_worker_id=swap_request.targetWorkerId,
        )

        response = created_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to create swap request: {e}")
        handle_routes_errors(e)
    return response


@router.get("/swaps/teams/{team_id}")
async def get_swap_requests(
    team_id: str,
    status: Optional[str] = None,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> list[SwapRequestDTO]:
    """Get all swap requests for a team, optionally filtered by status."""
    try:
        # Check permission
        if not await authz_check(user_context.user_id, "read-swap", "team", team_id):
            raise NotAuthorizedError("You do not have permission to view swap requests")

        # Parse status filter
        status_filter = SwapStatus(status) if status else None

        # Get swaps
        swaps = swap_service.get_swaps_for_team(team_id, status_filter)

        # Filter out denied swaps unless explicitly requested
        if status_filter is None:
            swaps = [swap for swap in swaps if swap.status != SwapStatus.DENIED]

        response = [swap.to_dto() for swap in swaps]
    except Exception as e:
        log_info(f"Failed to get swap requests: {e}")
        handle_routes_errors(e)
    return response


@router.get("/swaps/{swap_id}")
async def get_swap_request(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Get a specific swap request by ID."""
    try:
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission for the team
        if not await authz_check(
            user_context.user_id, "read-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to view this swap request"
            )

        response = swap.to_dto()
    except Exception as e:
        log_info(f"Failed to get swap request: {e}")
        handle_routes_errors(e)
    return response


@router.post("/swaps/{swap_id}/bids", status_code=201)
async def add_bid_to_swap(
    swap_id: str,
    bidder_worker_id: str,
    offered_assignment_ids: list[str],
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Add a bid to an open swap request."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission
        if not await authz_check(
            user_context.user_id, "create-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to bid on swaps")

        # Add the bid
        updated_swap = swap_service.add_bid_to_open_swap(
            swap_id=swap_id,
            bidder_worker_id=bidder_worker_id,
            offered_assignment_ids=offered_assignment_ids,
            team_id=swap.team_id,
        )

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to add bid to swap: {e}")
        handle_routes_errors(e)
    return response


@router.post("/swaps/{swap_id}/accept-bid/{bid_id}")
async def accept_bid(
    swap_id: str,
    bid_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Accept a bid on an open swap (moves to PENDING_APPROVAL)."""
    try:
        # Get the swap to check team and creator
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission
        if not await authz_check(
            user_context.user_id, "create-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to accept bids")

        # Accept the bid
        updated_swap = swap_service.accept_bid_on_open_swap(
            swap_id=swap_id, bid_id=bid_id
        )

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to accept bid: {e}")
        handle_routes_errors(e)
    return response


@router.post("/swaps/{swap_id}/accept")
async def accept_direct_swap(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Accept a direct swap invitation (moves to PENDING_APPROVAL)."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission
        if not await authz_check(
            user_context.user_id, "create-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to accept swaps")

        # Accept the direct swap
        updated_swap = swap_service.accept_direct_swap(swap_id=swap_id)

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to accept direct swap: {e}")
        handle_routes_errors(e)
    return response


@router.post("/swaps/{swap_id}/approve")
async def approve_swap(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Approve a swap request (completes the swap)."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission - only team leaders can approve
        if not await authz_check(
            user_context.user_id, "approve-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to approve swaps")

        # Approve the swap
        updated_swap = swap_service.approve_swap(
            swap_id=swap_id,
            approver_user_id=user_context.user_id,
        )

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to approve swap: {e}")
        handle_routes_errors(e)
    return response


@router.delete("/swaps/{swap_id}", status_code=204)
async def delete_swap(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> None:
    """Delete a swap request."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission - creator or leader can delete
        can_create = await authz_check(
            user_context.user_id, "create-swap", "team", swap.team_id
        )
        can_approve = await authz_check(
            user_context.user_id, "approve-swap", "team", swap.team_id
        )

        if not (can_create or can_approve):
            raise NotAuthorizedError("You do not have permission to delete this swap")

        # Delete the swap
        swap_service.delete_swap(swap_id=swap_id)

    except Exception as e:
        log_info(f"Failed to delete swap: {e}")
        handle_routes_errors(e)


@router.post("/swaps/{swap_id}/deny")
async def deny_swap(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Deny a swap request (leader only)."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission - only leader can deny
        if not await authz_check(
            user_context.user_id, "approve-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to deny this swap")

        # Deny the swap
        updated_swap = swap_service.deny_swap(
            swap_id=swap_id, denier_user_id=user_context.user_id
        )

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to deny swap: {e}")
        handle_routes_errors(e)
    return response


@router.post("/swaps/{swap_id}/revert")
async def revert_swap(
    swap_id: str,
    user_context: UserContext = Depends(get_user_context),
    swap_service: SwapService = Depends(get_swap_service),
) -> SwapRequestDTO:
    """Revert a completed swap (leader only)."""
    try:
        # Get the swap to check team
        swap = swap_service.get_swap_by_id(swap_id)
        if not swap:
            raise ValueError(f"Swap request {swap_id} not found")

        # Check permission - only leader can revert
        if not await authz_check(
            user_context.user_id, "approve-swap", "team", swap.team_id
        ):
            raise NotAuthorizedError("You do not have permission to revert this swap")

        # Revert the swap
        updated_swap = swap_service.revert_swap(
            swap_id=swap_id, reverter_user_id=user_context.user_id
        )

        response = updated_swap.to_dto()
    except Exception as e:
        log_info(f"Failed to revert swap: {e}")
        handle_routes_errors(e)
    return response
