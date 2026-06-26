"""
Admin routes for super-admin operations including account impersonation.

Impersonation is stateless and JWT-based. When an admin activates impersonation
the server issues a short-lived HS256 JWT containing the admin's ID and the
target user's ID. The frontend stores this token in sessionStorage and sends
it as the X-Impersonation-Token header on every subsequent request.
get_user_context verifies the JWT inline — no DB lookup required.

IMPERSONATION-EXEMPT: All routes in this module intentionally use
user_context.user_id (the real admin identity) for every operation.
They must never be replaced with effective_user_id so that impersonation
management actions are always attributed to the actual admin, not the
target user being impersonated.
"""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto.user import UserDTO

from src.config import config
from src.dependencies import (
    get_cerbos_authz_service,
    get_db_collections,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.impersonation_token import create_impersonation_token
from src.security.user_context import UserContext


class ImpersonationTokenResponse(BaseModel):
    """Response body for a successful impersonation start."""

    token: str
    expires_in: int


router = APIRouter()


@router.post("/admin/users/{target_user_id}/impersonate")
async def start_impersonation(
    target_user_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ImpersonationTokenResponse:
    """
    Start accessing a user's account as a super-admin.

    Issues a short-lived signed JWT containing the admin's ID and the target
    user's ID. The frontend stores this token and sends it as the
    X-Impersonation-Token request header. get_user_context verifies the JWT
    inline on every subsequent request — no DB lookup required.

    Requires the create-impersonation permission on the admin resource.
    """
    response: ImpersonationTokenResponse
    try:
        admin_user_id = user_context.user_id

        if not await authz_service.check(
            admin_user_id, "create-impersonation", "admin", "admin"
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access user accounts",
            )

        # Verify the target user exists before issuing a token
        target_user = db_collections.user_db.get_user_by_id(target_user_id)
        if target_user is None:
            raise HTTPException(status_code=404, detail="Target user not found")

        # Prevent admins from impersonating themselves
        if admin_user_id == target_user_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot access your own account via impersonation",
            )

        token = create_impersonation_token(
            admin_id=admin_user_id,
            target_id=target_user_id,
            secret=config.impersonation_jwt_secret,
            ttl_seconds=config.impersonation_token_ttl_seconds,
        )

        log_info(f"Admin {admin_user_id} started impersonating user {target_user_id}")

        response = ImpersonationTokenResponse(
            token=token,
            expires_in=config.impersonation_token_ttl_seconds,
        )
    except NotAuthorizedError, HTTPException:
        raise
    except Exception as e:
        log_info("Failed to start impersonation")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]


@router.delete("/admin/users/impersonate")
async def stop_impersonation(
    user_context: UserContext = Depends(get_user_context),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> Dict:
    """
    Stop impersonating and restore the admin's own session.

    Impersonation is now stateless (JWT-based), so there is nothing to clear
    on the server. The frontend simply discards the token from sessionStorage.

    Requires the delete-impersonation permission on the admin resource.
    """
    response: Dict
    try:
        admin_user_id = user_context.user_id

        if not await authz_service.check(
            admin_user_id, "delete-impersonation", "admin", "admin"
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to stop impersonation",
            )

        log_info(f"Admin {admin_user_id} stopped impersonation")

        response = {"message": "Impersonation stopped"}
    except NotAuthorizedError, HTTPException:
        raise
    except Exception as e:
        log_info("Failed to stop impersonation")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]


@router.get("/admin/users")
async def list_all_users(
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[UserDTO]:
    """
    Admin endpoint: list all users in the database.
    Requires the read-users permission on the admin resource.
    """
    response: List[UserDTO]
    try:
        if not await authz_service.check(
            user_context.user_id, "read-users", "admin", "admin"
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to list users",
            )
        users = db_collections.user_db.get_users()
        response = [u.to_dto() for u in users]
    except NotAuthorizedError, HTTPException:
        raise
    except Exception as e:
        log_info("Failed to list all users")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]
