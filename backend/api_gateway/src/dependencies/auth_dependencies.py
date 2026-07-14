"""
FastAPI dependencies for service and user authentication.

Production mode extracts user identity from the ``rockilus_access_token``
HttpOnly cookie (decoded with Cognito JWKS).  Development mode uses header-based
bypass unchanged.
"""

import logging
from functools import lru_cache
from typing import Annotated, Optional

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, Request
from jwt import PyJWKClient
from jwt.types import Options
from shared.database.database_collections import DatabaseCollections

from src.config import config
from src.dependencies.database import get_db_collections
from src.security.impersonation_token import verify_impersonation_token
from src.security.service_auth import (
    ServiceAuthError,
    validate_service_api_key,
)
from src.security.user_context import UserContext

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# JWKS client (cached — one per worker process)
# ---------------------------------------------------------------------------


def _build_jwks_url() -> str:
    pool = config.cognito_user_pool_id
    region = config.aws_region
    if config.cognito_endpoint_url:
        return f"{config.cognito_endpoint_url}/{pool}/.well-known/jwks.json"
    return f"https://cognito-idp.{region}.amazonaws.com/{pool}/.well-known/jwks.json"


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    url = _build_jwks_url()
    logger.info("Creating JWKS client for: %s", url)
    # cache_keys=True: fetched keys are cached; only refreshed on unknown kid
    return PyJWKClient(url, cache_keys=True, lifespan=86400)


def _decode_access_token(token: str) -> dict:
    """Validate and decode a Cognito access-token JWT.  Returns claims."""
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    decode_options: Options = {"verify_exp": True, "verify_aud": False}
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options=decode_options,
    )


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


async def verify_service_authentication(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
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
    x_dev_user_id: Annotated[Optional[str], Header(alias="X-Dev-User-ID")] = None,
    x_api_key: Annotated[Optional[str], Header(alias="X-API-Key")] = None,
    x_impersonation_token: Annotated[
        Optional[str], Header(alias="X-Impersonation-Token")
    ] = None,
    rockilus_access_token: Annotated[
        Optional[str], Cookie(alias="rockilus_access_token")
    ] = None,
    authorization: Annotated[Optional[str], Header(alias="Authorization")] = None,
) -> UserContext:
    """Extract user context from cookie (primary), Bearer token, or dev headers."""

    if (
        authorization
        and authorization.startswith("Bearer ")
        and not rockilus_access_token
    ):
        logger.debug("Bearer-token-based auth")
        try:
            token = authorization.removeprefix("Bearer ")
            claims = _decode_access_token(token)
            user_context = UserContext(
                user_id=claims["sub"],
                email=claims.get("email"),
                groups=claims.get("cognito:groups", []),
                request_id=request.headers.get("X-Request-ID"),
                source_ip=request.headers.get("X-Source-IP"),
            )
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
            logger.warning("Invalid Bearer token: %s", e)  # nosemgrep
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired Bearer token",
            ) from e

    elif rockilus_access_token:
        logger.debug("Cookie-based auth")
        try:
            claims = _decode_access_token(rockilus_access_token)
            user_context = UserContext(
                user_id=claims["sub"],
                email=claims.get("email"),
                groups=claims.get("cognito:groups", []),
                request_id=request.headers.get("X-Request-ID"),
                source_ip=request.headers.get("X-Source-IP"),
            )
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
            logger.warning("Invalid access token cookie: %s", e)  # nosemgrep
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session",
            ) from e
    elif config.environment == "development":
        logger.debug("Development mode: using header-based auth")

        if x_api_key != config.dev_api_key:
            logger.warning("Invalid or missing development API key")
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing development API key",
            )

        user_id = x_dev_user_id or config.dev_user_id
        user_email = config.dev_user_email

        logger.debug("Development auth: user_id=%s, email=%s", user_id, user_email)

        user_context = UserContext(
            user_id=user_id,
            email=user_email,
            groups=["user"],
        )
    else:
        raise HTTPException(
            status_code=401,
            detail="Authentication required — please sign in",
        )

    # If an impersonation token is present, verify it and populate the context.
    # This is environment-agnostic so dev sessions can also impersonate.
    if x_impersonation_token:
        try:
            claims = verify_impersonation_token(
                x_impersonation_token, config.impersonation_jwt_secret
            )
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=401, detail="Impersonation token has expired"
            ) from exc
        except jwt.InvalidTokenError as exc:
            logger.warning("Invalid impersonation token: %s", exc)  # nosemgrep
            raise HTTPException(
                status_code=401, detail="Invalid impersonation token"
            ) from exc

        if claims["sub"] != user_context.user_id:
            logger.warning(  # nosemgrep
                "Impersonation token sub mismatch: token sub=%s, request user=%s",
                claims["sub"],
                user_context.user_id,
            )
            raise HTTPException(
                status_code=403,
                detail="Impersonation token was issued for a different user",
            )

        user_context.impersonated_user_id = claims["impersonating"]
        user_context.is_impersonating = True
        logger.debug(
            "Admin %s is impersonating user %s (JWT)",
            user_context.user_id,
            claims["impersonating"],
        )

    return user_context


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
