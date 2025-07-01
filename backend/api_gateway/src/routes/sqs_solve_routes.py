"""
SQS-based solve routes for schedules.

This module provides endpoints for submitting solve requests via SQS
and checking solve status.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from shared.schemas.core import SolveRequest
from shared.schemas.dto import SolveTaskStatusResponseDTO

from src.dependencies.sqs_solve_service import get_sqs_solve_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.sqs_solve_service import APIGatewaySQSSolveService

router = APIRouter(prefix="/sqs", tags=["SQS Solve"])


@router.post(
    "/sqs-solve/start",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit schedule solve request via SQS (frontend-aligned)",
    description="Submit a schedule for solving using the SQS queue system. "
    + "Accepts JSON body for compatibility with frontend API client.",
)
async def submit_solve_request(
    body: SolveRequest,
    session: SessionContainerType = Depends(authn_verify_session()),
    sqs_solve_service: APIGatewaySQSSolveService = Depends(get_sqs_solve_service),
) -> SolveTaskStatusResponseDTO:
    """
    Submit a solve request via SQS.

    This endpoint queues a solve request for processing by the solve service.
    The request is processed asynchronously, and the client can check status
    using the status endpoint.

    Args:
        body: JSON body with schedule_id and team_id
        session: Authentication session
        sqs_solve_service: SQS solve service

    Returns:
        Dictionary with message_id, status, and schedule_id

    Raises:
        HTTPException: If unauthorized or solve request fails
    """
    try:

        # Validate and extract required fields
        schedule_id = body.schedule_id
        team_id = body.team_id

        # Check authorization
        if not await authz_check(
            session.get_user_id(), "solve-schedule", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to solve a schedule")

        # Submit solve request (defaults: NORMAL priority, FULL_SOLVE type)
        result = await sqs_solve_service.submit_solve_request(
            schedule_id=schedule_id,
            team_id=team_id,
            user_id=session.get_user_id(),
        )

        logger.info(
            f"SQS solve request submitted for schedule {schedule_id} "
            f"by user {session.get_user_id()}"
        )
        response = result.to_response_dto()
        return response

    except ValueError as ve:
        logger.warning(f"Invalid solve request: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve
    except NotAuthorizedError:
        raise
    except Exception as e:
        logger.error(f"Failed to submit solve request: {e}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit solve request",
        ) from e


@router.get(
    "/sqs-solve/{solve_id}/status",
    summary="Get solve status by solve_id (frontend-aligned)",
    description="Get the current solve status and details for a solve request "
    + "by solve_id.",
)
async def get_solve_status_by_id(
    solve_id: str,
    _: SessionContainerType = Depends(authn_verify_session()),
    sqs_solve_service: APIGatewaySQSSolveService = Depends(get_sqs_solve_service),
) -> SolveTaskStatusResponseDTO:
    """
    Get the current solve status for a solve request by solve_id.

    Args:
        solve_id: ID of the solve request
        session: Authentication session
        sqs_solve_service: SQS solve service

    Returns:
        Dictionary with status information

    Raises:
        HTTPException: If unauthorized or solve not found
    """
    try:
        # Get solve status (will raise if not found or not authorized)
        result = await sqs_solve_service.get_solve_status(solve_id=solve_id)
        response = result.to_response_dto()
        return response
    except NotAuthorizedError:
        raise
    except ValueError as ve:
        logger.warning(f"Invalid solve status request: {ve}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        ) from ve
    except Exception as e:
        logger.error(f"Failed to get solve status by id: {e}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get solve status",
        ) from e
