from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import PasswordData
from shared.schemas.dto import WorkerDTO
from shared.schemas.dto.user import PasswordDataDTO, UserDTO, UserUpdateDTO

from src.dependencies import (
    get_db_collections,
    get_user_context,
    get_user_service,
    verify_service_authentication,
    get_cerbos_authz_service,
)
from src.errors import (
    NotAuthorizedError,
    PasswordsDoNotMatchError,
    handle_routes_errors,
)
from src.integrations.authorization import authz_check
from src.integrations.authorization.cerbos_authz_service import (  # noqa: E501
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.user_service import UserService

router = APIRouter()


class NewUserInput(BaseModel):
    user_id: str  # This is the Cognito 'sub' attribute
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    language: Optional[str] = None


@router.post(
    "/users/onboard", dependencies=[Depends(verify_service_authentication)]
)
async def onboard_new_user(
    user_input: NewUserInput,
    user_service: UserService = Depends(get_user_service),
) -> Dict:
    try:
        await user_service.create_user(
            user_id=user_input.user_id,
            email=user_input.email,
            first_name=user_input.first_name,
            last_name=user_input.last_name,
            language=user_input.language,
        )

        log_info(
            f"Successfully processed onboard request for user {user_input.email}"
        )
        return {"status": "success", "message": "User onboarded successfully"}

    except Exception as e:
        log_info(f"Failed to onboard user {user_input.email}: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error"
        ) from e


@router.get("/users/me")
async def get_current_user(
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> UserDTO:
    try:
        if not await authz_service.check(
            user_context.user_id, "read", "user", user_context.user_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read the user"
            )
        user = db_collections.user_db.get_user_by_id(
            user_context.effective_user_id
        )
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        response = user.to_dto()
    except Exception as e:
        log_info("Failed to get current user")
        handle_routes_errors(e)
    return response


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    user_service: UserService = Depends(get_user_service),
) -> UserDTO:
    """Update the authenticated user's own profile.

    Only firstName, lastName, email, and language may be changed.
    system_role and impersonatingUserId are ignored — they are always
    carried over from the existing DB record.
    """
    try:
        if user_context.effective_user_id != user_id:
            raise NotAuthorizedError("You can only update your own profile")
        if not await authz_check(
            user_context.user_id, "update", "user", user_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update this user"
            )
        updated_user = await user_service.update_user(
            user_id=user_id,
            update_dto=user_update,
        )
        response = updated_user.to_dto()
    except Exception as e:
        log_info(f"Failed to update user {user_id}")
        handle_routes_errors(e)
    return response


@router.get("/users/me/worker/teams/{team_id}")
async def get_user_worker_for_team(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> WorkerDTO | None:
    """
    Get the worker associated with the authenticated user for a specific team.
    Returns None if no worker is linked to the user for this team.
    """
    try:
        # Check permission to read workers for this team
        if not await authz_check(
            user_context.user_id, "read-workers", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to access workers for this team"
            )

        # Get workers linked to this user for the specified team
        workers = db_collections.worker_db.get_workers_by_team_and_user(
            team_id=team_id, user_id=user_context.effective_user_id
        )

        if not workers:
            log_info(
                f"No worker found for user {user_context.effective_user_id} in "
                + f"team {team_id}. "
                "User may need worker association created by team admin."
            )
            return None

        # Take first worker (assumption: one worker per user per team)
        worker = workers[0]

        # Log warning if multiple workers found
        if len(workers) > 1:
            log_info(
                f"Warning: Multiple workers ({len(workers)}) found for "
                f"user {user_context.effective_user_id} in team {team_id}. "
                f"Returning first worker: {worker.id}"
            )

        # Get attributes for the worker
        attributes = db_collections.attribute_db.get_attributes_by_owner_id(
            worker.id
        )
        response = worker.to_dto(attributes)

    except Exception as e:
        log_info(f"Failed to get user worker for team {team_id}")
        handle_routes_errors(e)

    return response


@router.put("/users/{user_id}/change-password")
async def change_user_password(
    user_id: str,
    password_data: PasswordDataDTO,
    user_context: UserContext = Depends(get_user_context),
    user_service: UserService = Depends(get_user_service),
) -> Dict:
    try:
        # Authorization: Users can only change their own password
        if user_context.user_id != user_id:
            raise NotAuthorizedError("You can only change your own password")

        # Convert DTO to core model
        p_data = PasswordData.from_dto(password_data)

        # Validate passwords match
        if p_data.new_password != p_data.new_password_confirm:
            raise PasswordsDoNotMatchError("Passwords do not match")

        # Change password using Cognito
        await user_service.change_user_password(password_data=p_data)

        response = {"message": "Password updated successfully"}
    except Exception as e:
        log_info("Failed to update user password")
        handle_routes_errors(e)
    return response
