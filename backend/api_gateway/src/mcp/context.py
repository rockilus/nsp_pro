import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

import jwt
from fastapi import HTTPException, Request
from shared.database.database_collections import DatabaseCollections

from src.dependencies.auth_dependencies import _decode_access_token
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.integrations.authorization.cerbos_client import get_cerbos_client
from src.security.user_context import UserContext

if TYPE_CHECKING:
    from fastmcp import Context

logger = logging.getLogger(__name__)


@dataclass
class MCPContext:
    user_context: UserContext
    cerbos: CerbosAuthzService
    db: DatabaseCollections

    @classmethod
    async def from_request(cls, request: Request, app_state) -> "MCPContext":
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            logger.warning(
                "MCP request rejected: missing or malformed Authorization header"
            )
            raise HTTPException(
                status_code=401, detail="Bearer token required for MCP access"
            )

        token = auth_header.removeprefix("Bearer ")

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
