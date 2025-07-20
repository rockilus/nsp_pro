"""
Internal API routes for service-to-service communication.
These endpoints are called by AWS Lambda and other internal services.
"""

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from shared.logger import log_info

from src.dependencies import (
    get_user_service,
    verify_service_authentication,
)
from src.services.user_service import UserService

router = APIRouter(prefix="/internal", tags=["internal"])


class InternalUserOnboardInput(BaseModel):
    """
    Input model for internal user onboarding from Cognito post-confirmation.
    """

    user_id: str  # Cognito 'sub' attribute
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    cognito_user_pool_id: Optional[str] = None


@router.post(
    "/onboard",
    dependencies=[Depends(verify_service_authentication)],
    response_model=Dict[str, str],
    summary="Internal User Onboarding",
    description=(
        "Internal endpoint for onboarding users from Cognito "
        "post-confirmation Lambda"
    ),
)
async def internal_onboard_user(
    user_input: InternalUserOnboardInput,
    user_service: UserService = Depends(get_user_service),
) -> Dict[str, str]:
    """
    Internal endpoint for user onboarding called by Cognito
    post-confirmation Lambda.

    This endpoint:
    1. Validates the user data from Cognito
    2. Creates the user in the NSP Pro system
    3. Returns success/failure status

    Args:
        user_input: User data from Cognito post-confirmation event
        user_service: Injected user service dependency

    Returns:
        Dict with status and message

    Raises:
        HTTPException: If user creation fails
    """
    try:
        log_info(
            f"Internal onboard request for user: {user_input.user_id} "
            f"({user_input.email})"
        )

        # Create user in the system
        await user_service.create_user(
            user_id=user_input.user_id,
            email=user_input.email,
            first_name=user_input.first_name,
            last_name=user_input.last_name,
        )

        log_info(f"Successfully onboarded user: {user_input.user_id}")

        return {
            "status": "success",
            "message": f"User {user_input.email} onboarded successfully",
            "user_id": user_input.user_id,
        }

    except Exception as e:
        log_info(f"Failed to onboard user {user_input.user_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to onboard user: {str(e)}"
        ) from e


@router.get(
    "/health",
    dependencies=[Depends(verify_service_authentication)],
    response_model=Dict[str, str],
    summary="Internal Health Check",
    description="Internal health check endpoint for service monitoring",
)
async def internal_health_check() -> Dict[str, str]:
    """
    Internal health check endpoint for service monitoring.

    Returns:
        Dict with service status
    """
    return {
        "status": "healthy",
        "service": "nsp-pro-backend",
        "component": "internal-api",
    }
