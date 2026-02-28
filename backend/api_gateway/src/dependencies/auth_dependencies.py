"""
FastAPI dependencies for service and user authentication.
Replaces the current authentication system with API Gateway-based auth.
"""

import logging
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, Request
from shared.database.database_collections import DatabaseCollections

from src.config import config
from src.dependencies.database import get_db_collections
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
    request: Request,
    x_dev_user_id: Annotated[
        Optional[str], Header(alias="X-Dev-User-ID")
    ] = None,
    x_api_key: Annotated[Optional[str], Header(alias="X-API-Key")] = None,
) -> UserContext:
    """Extract user context from request headers or token."""

    if config.environment == "development":
        # Development mode: use headers for authentication
        logger.debug("Development mode: using header-based authentication")

        # Check for development API key
        if x_api_key != config.dev_api_key:
            logger.warning("Invalid or missing development API key")
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing development API key",
            )

        # Use provided user ID or default from config
        user_id = x_dev_user_id or config.dev_user_id
        user_email = config.dev_user_email

        logger.debug(
            "Development auth: user_id=%s, email=%s", user_id, user_email
        )

        return UserContext(
            user_id=user_id,
            email=user_email,
            groups=["user"],  # Default group for development
        )

    # Production mode: extract from Cognito headers via API Gateway
    logger.debug("Production mode: using Cognito authentication")

    # Extract standard API Gateway headers for production
    x_user_sub = request.headers.get("X-User-Sub")
    x_user_email = request.headers.get("X-User-Email")
    x_user_groups = request.headers.get("X-User-Groups")
    x_request_id = request.headers.get("X-Request-ID")
    x_source_ip = request.headers.get("X-Source-IP")

    # Use the existing extract_user_context function for production
    return extract_user_context(
        x_user_sub=x_user_sub,
        x_user_email=x_user_email,
        x_user_groups=x_user_groups,
        x_request_id=x_request_id,
        x_source_ip=x_source_ip,
    )


async def get_effective_user_context(
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserContext:
    """
    Extends the base user context with impersonation state.

    Looks up the authenticated user's DB record and, if they have set
    an active impersonation target (impersonating_user_id != None), marks
    the UserContext accordingly so route handlers can serve data scoped
    to the target user via user_context.effective_user_id.
    """
    user = db_collections.user_db.get_user_by_id(user_context.user_id)
    if user and user.impersonating_user_id:
        user_context.impersonated_user_id = user.impersonating_user_id
        user_context.is_impersonating = True
        logger.debug(
            "Admin %s is impersonating user %s",
            user_context.user_id,
            user.impersonating_user_id,
        )
    return user_context
