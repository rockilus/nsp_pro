"""
FastAPI dependencies for service and user authentication.
Replaces the current authentication system with API Gateway-based auth.
"""

import logging
import os
from typing import Optional

from fastapi import Depends, Header, HTTPException

from src.security.service_auth import (
    ServiceAuthError,
    validate_service_api_key,
)
from src.security.user_context import UserContext, extract_user_context

logger = logging.getLogger(__name__)


async def verify_service_authentication(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> bool:
    """
    FastAPI dependency to verify service authentication from API Gateway.

    Args:
        x_api_key: API key from X-API-Key header

    Returns:
        bool: True if authentication successful

    Raises:
        HTTPException: If authentication fails
    """
    try:
        if not validate_service_api_key(x_api_key):
            logger.warning("Service authentication failed - invalid API key")
            raise HTTPException(
                status_code=401, detail="Service authentication required"
            )

        logger.debug("Service authentication successful")
        return True

    except ServiceAuthError as e:
        logger.error("Service authentication error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Service authentication configuration error",
        ) from e
    except Exception as e:
        logger.error("Unexpected service authentication error: %s", e)
        raise HTTPException(
            status_code=500, detail="Service authentication failed"
        ) from e


async def get_user_context(
    x_user_sub: Optional[str] = Header(None, alias="X-User-Sub"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_groups: Optional[str] = Header(None, alias="X-User-Groups"),
    x_request_id: Optional[str] = Header(None, alias="X-Request-ID"),
    x_source_ip: Optional[str] = Header(None, alias="X-Source-IP"),
    x_dev_user_id: Optional[str] = Header(None, alias="X-Dev-User-ID"),
    _service_auth: bool = Depends(verify_service_authentication),
) -> UserContext:
    """
    FastAPI dependency to extract user context from API Gateway headers.
    In development mode, uses X-Dev-User-ID header instead of Cognito headers.

    Args:
        x_user_sub: User ID from Cognito (production)
        x_user_email: User email from Cognito (production)
        x_user_groups: User groups from Cognito (production)
        x_request_id: Request ID for tracing
        x_source_ip: Source IP for logging
        x_dev_user_id: Development user ID (development only)
        _service_auth: Service authentication dependency

    Returns:
        UserContext: Extracted user context

    Raises:
        HTTPException: If user context is invalid
    """
    environment = os.getenv("ENVIRONMENT", "development").lower()

    try:
        if environment == "development":
            # Development mode: use X-Dev-User-ID header or environment default
            dev_user_id = x_dev_user_id or os.getenv(
                "DEV_USER_ID", "dev-user-123"
            )
            dev_user_email = os.getenv("DEV_USER_EMAIL", "dev@nsp-pro.com")

            logger.debug(f"Development mode: using dev user ID {dev_user_id}")

            user_context = extract_user_context(
                x_user_sub=dev_user_id,
                x_user_email=dev_user_email,
                x_user_groups="developers",
                x_request_id=x_request_id or f"dev-request-{id({})}",
                x_source_ip=x_source_ip or "127.0.0.1",
            )
        else:
            # Production mode: use existing Cognito headers
            user_context = extract_user_context(
                x_user_sub=x_user_sub,
                x_user_email=x_user_email,
                x_user_groups=x_user_groups,
                x_request_id=x_request_id,
                x_source_ip=x_source_ip,
            )

        logger.info(
            "User context extracted for request",
            extra={
                "user_id": user_context.user_id,
                "request_id": user_context.request_id,
                "source_ip": user_context.source_ip,
                "environment": environment,
            },
        )

        return user_context

    except ValueError as e:
        logger.warning("Invalid user context: %s", e)
        raise HTTPException(status_code=401, detail=str(e)) from e
    except Exception as e:
        logger.error("Failed to extract user context: %s", e)
        raise HTTPException(
            status_code=500, detail="Failed to process user context"
        ) from e
