"""
SQS-based solve routes for schedules.

This module provides endpoints for submitting solve requests via SQS
and checking solve status.
"""

from dataclasses import dataclass
from typing import Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from loguru import logger
from pydantic import BaseModel
from shared.schemas.core.sqs_messages import (
    SolveRequestPriority,
    SolveRequestType,
)
from shared.schemas.core import SqsSolveRequest

from src.dependencies.sqs_solve_service import get_sqs_solve_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.api_gateway_sqs_solve_service import (
    APIGatewaySQSSolveService,
)

router = APIRouter(prefix="/sqs", tags=["SQS Solve"])


@router.post(
    "/sqs-solve/start",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit schedule solve request via SQS (frontend-aligned)",
    description="Submit a schedule for solving using the SQS queue system. Accepts JSON body for compatibility with frontend API client.",
)
async def submit_solve_request(
    body: SqsSolveRequest,
    session: SessionContainerType = Depends(authn_verify_session()),
    sqs_solve_service: APIGatewaySQSSolveService = Depends(
        get_sqs_solve_service
    ),
) -> Dict[str, str]:
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
            raise NotAuthorizedError(
                "You do not have permission to solve a schedule"
            )

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

        return result

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
    "/schedules/{schedule_id}/solve-status/teams/{team_id}",
    summary="Get solve status for a schedule",
    description="Get the current solve status and details for a schedule",
)
async def get_solve_status(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    sqs_solve_service: APIGatewaySQSSolveService = Depends(
        get_sqs_solve_service
    ),
) -> Dict[str, str]:
    """
    Get the current solve status for a schedule.

    Args:
        schedule_id: ID of the schedule
        team_id: Team ID for authorization
        session: Authentication session
        sqs_solve_service: SQS solve service

    Returns:
        Dictionary with status information

    Raises:
        HTTPException: If unauthorized or schedule not found
    """
    try:
        # Check authorization
        if not await authz_check(
            session.get_user_id(), "read-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read schedule status"
            )

        # Get solve status
        result = await sqs_solve_service.get_solve_status(schedule_id)

        return result

    except ValueError as ve:
        logger.warning(f"Invalid status request: {ve}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        ) from ve
    except NotAuthorizedError:
        raise
    except Exception as e:
        logger.error(f"Failed to get solve status: {e}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get solve status",
        ) from e
