import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

import jwt
from fastapi import HTTPException, Request
from shared.database.database_collections import DatabaseCollections

from src.config import config
from src.dependencies.auth_dependencies import _decode_access_token
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.integrations.authorization.cerbos_client import get_cerbos_client
from src.security.user_context import UserContext

if TYPE_CHECKING:
    from fastmcp import Context

logger = logging.getLogger(__name__)


def _resolve_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return auth.removeprefix("Bearer ")

    proxy_auth = request.headers.get("x-mcp-proxy-auth", "")
    if proxy_auth.startswith("Bearer "):
        return proxy_auth.removeprefix("Bearer ")

    return None


@dataclass
class MCPContext:
    user_context: UserContext
    cerbos: CerbosAuthzService
    db: DatabaseCollections

    @classmethod
    async def from_request(cls, request: Request, app_state) -> "MCPContext":
        token = _resolve_bearer_token(request)
        if token is not None:
            try:
                claims = _decode_access_token(token)
            except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
                logger.warning("MCP token decode failed: %s", e)  # nosemgrep
                raise HTTPException(
                    status_code=401, detail="Invalid or expired Bearer token"
                ) from e

            user_context = UserContext(
                user_id=claims["sub"],
                email=claims.get("email"),
                groups=claims.get("cognito:groups", []),
            )

        elif config.environment == "development":
            x_api_key = request.headers.get("x-api-key", "")
            if x_api_key != config.dev_api_key:
                logger.warning("MCP dev request rejected: invalid or missing X-API-Key")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or missing development API key",
                )

            user_id = request.headers.get("x-dev-user-id") or config.dev_user_id
            logger.debug("MCP dev auth: user_id=%s", user_id)

            user_context = UserContext(
                user_id=user_id,
                email=config.dev_user_email,
                groups=["user"],
            )

        else:
            logger.warning("MCP request rejected: no valid auth headers")
            raise HTTPException(
                status_code=401, detail="Bearer token required for MCP access"
            )

        db = app_state.db_collections

        cerbos = CerbosAuthzService(
            client=get_cerbos_client(),
            user_db=db.user_db,
            team_membership_db=db.team_membership_db,
        )

        return cls(user_context=user_context, cerbos=cerbos, db=db)


async def build_mcp_context(ctx: "Context") -> MCPContext:
    if ctx.request_context is None:
        raise HTTPException(status_code=500, detail="MCP request context not available")
    request = ctx.request_context.request
    if request is None:
        raise HTTPException(status_code=500, detail="MCP request not available")
    return await MCPContext.from_request(
        request,
        request.app.state,
    )
