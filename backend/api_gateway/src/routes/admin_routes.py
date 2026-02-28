"""
Admin routes for super-admin operations including account impersonation.

Impersonation is implemented by writing the target user's ID to the admin's
own user document (impersonating_user_id field). Downstream, the
get_effective_user_context dependency reads this field and exposes
user_context.effective_user_id, which routes use instead of user_context.user_id
when serving user-scoped data.
"""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto.user import UserDTO

from src.dependencies import (
    get_db_collections,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext

router = APIRouter()


@router.post("/admin/users/{target_user_id}/impersonate")
async def start_impersonation(
    target_user_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserDTO:
    """
    Start accessing a user's account as a super-admin.

    Writes impersonating_user_id = target_user_id on the admin's own user
    record. Subsequent requests that use get_effective_user_context will
    resolve effective_user_id to the target user, serving that user's data.

    Requires the create-impersonation permission on the admin resource.
    """
    response: UserDTO
    try:
        admin_user_id = user_context.user_id

        if not await authz_check(
            admin_user_id, "create-impersonation", "admin"
        ):
            raise NotAuthorizedError(
                "You do not have permission to access user accounts"
            )

        # Verify the target user exists before writing anything
        target_user = db_collections.user_db.get_user_by_id(target_user_id)
        if target_user is None:
            raise HTTPException(
                status_code=404, detail="Target user not found"
            )

        # Prevent admins from impersonating themselves
        if admin_user_id == target_user_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot access your own account via impersonation",
            )

        # Write the impersonation state to the admin's own record
        admin_user = db_collections.user_db.get_user_by_id(admin_user_id)
        if admin_user is None:
            raise HTTPException(status_code=404, detail="Admin user not found")

        admin_user.impersonating_user_id = target_user_id
        updated_admin = db_collections.user_db.update_user(admin_user)

        log_info(
            f"Admin {admin_user_id} started impersonating user {target_user_id}"
        )

        response = updated_admin.to_dto()
    except (NotAuthorizedError, HTTPException):
        raise
    except Exception as e:
        log_info("Failed to start impersonation")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]


@router.delete("/admin/users/impersonate")
async def stop_impersonation(
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict:
    """
    Stop impersonating and restore the admin's own session.

    Clears impersonating_user_id on the admin's user record.

    Requires the delete-impersonation permission on the admin resource.
    """
    response: Dict
    try:
        admin_user_id = user_context.user_id

        if not await authz_check(
            admin_user_id, "delete-impersonation", "admin"
        ):
            raise NotAuthorizedError(
                "You do not have permission to stop impersonation"
            )

        admin_user = db_collections.user_db.get_user_by_id(admin_user_id)
        if admin_user is None:
            raise HTTPException(status_code=404, detail="Admin user not found")

        admin_user.impersonating_user_id = None
        db_collections.user_db.update_user(admin_user)

        log_info(f"Admin {admin_user_id} stopped impersonation")

        response = {"message": "Impersonation stopped"}
    except (NotAuthorizedError, HTTPException):
        raise
    except Exception as e:
        log_info("Failed to stop impersonation")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]


@router.get("/admin/users")
async def list_all_users(
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[UserDTO]:
    """
    Admin endpoint: list all users in the database.
    Requires the read-users permission on the admin resource.
    """
    response: List[UserDTO]
    try:
        if not await authz_check(user_context.user_id, "read-users", "admin"):
            raise NotAuthorizedError(
                "You do not have permission to list users"
            )
        users = db_collections.user_db.get_users()
        response = [u.to_dto() for u in users]
    except (NotAuthorizedError, HTTPException):
        raise
    except Exception as e:
        log_info("Failed to list all users")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]
