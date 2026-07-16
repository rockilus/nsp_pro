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

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto.user import UserDTO

from src.config import config
from src.dependencies import (
    get_cerbos_authz_service,
    get_db_collections,
    get_test_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.impersonation_token import create_impersonation_token
from src.security.user_context import UserContext
from src.services.test_service import (
    EXPORTABLE_DATA_TYPES,
    SolverTestScenariosService,
)


class ImpersonationTokenResponse(BaseModel):
    """Response body for a successful impersonation start."""

    token: str
    expires_in: int


class AdminTeamSummary(BaseModel):
    """A team a user belongs to, with the user's role in it."""

    id: str
    name: str
    role: str


class AdminUserDetailsResponse(BaseModel):
    """Response body for the admin user details endpoint."""

    user: UserDTO
    teams: List[AdminTeamSummary]


class ExportSelection(BaseModel):
    """One team and the data types to export from it."""

    teamId: str
    dataTypes: List[str]


class UserDataExportRequest(BaseModel):
    """Request body for the admin user data export endpoint."""

    selections: List[ExportSelection]


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


def _get_user_team_summaries(
    db_collections: DatabaseCollections, user_id: str
) -> List[AdminTeamSummary]:
    """Return the teams a user belongs to, with the user's role in each."""
    memberships = db_collections.team_membership_db.get_team_memberships_by_user_id(
        user_id=user_id
    )
    role_by_team_id = {m.team_id: m.role.value for m in memberships}
    teams = db_collections.team_db.get_teams_by_ids(list(role_by_team_id.keys()))
    return [
        AdminTeamSummary(
            id=team.id,
            name=team.name,
            role=role_by_team_id.get(team.id, ""),
        )
        for team in teams
    ]


@router.get("/admin/users/{target_user_id}")
async def get_user_details(
    target_user_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> AdminUserDetailsResponse:
    """
    Admin endpoint: get a user's profile and the teams they belong to.
    Requires the read-users permission on the admin resource.
    """
    response: AdminUserDetailsResponse
    try:
        if not await authz_service.check(
            user_context.user_id, "read-users", "admin", "admin"
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view user details",
            )

        target_user = db_collections.user_db.get_user_by_id(target_user_id)
        if target_user is None:
            raise HTTPException(status_code=404, detail="Target user not found")

        response = AdminUserDetailsResponse(
            user=target_user.to_dto(),
            teams=_get_user_team_summaries(db_collections, target_user_id),
        )
    except NotAuthorizedError, HTTPException:
        raise
    except Exception as e:
        log_info("Failed to get user details")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]


@router.post("/admin/users/{target_user_id}/export")
async def export_user_data(
    target_user_id: str,
    export_request: UserDataExportRequest,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz_service: CerbosAuthzService = Depends(get_cerbos_authz_service),
    test_service: SolverTestScenariosService = Depends(get_test_service),
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """
    Admin endpoint: export the selected data of a user's teams as raw
    Mongo-shaped JSON, keyed by team name — the same shape as a scenario in
    tests/test_data/solver_data.json.

    Requires the export-user-data permission on the admin resource.
    """
    response: Dict[str, Dict[str, List[Dict[str, Any]]]]
    try:
        admin_user_id = user_context.user_id

        if not await authz_service.check(
            admin_user_id, "export-user-data", "admin", "admin"
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to export user data",
            )

        target_user = db_collections.user_db.get_user_by_id(target_user_id)
        if target_user is None:
            raise HTTPException(status_code=404, detail="Target user not found")

        user_teams = _get_user_team_summaries(db_collections, target_user_id)
        teams_by_id = {team.id: team for team in user_teams}

        for selection in export_request.selections:
            if selection.teamId not in teams_by_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Team {selection.teamId} does not belong to the target user"
                    ),
                )
            unknown = set(selection.dataTypes) - set(EXPORTABLE_DATA_TYPES)
            if unknown:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown data types: {sorted(unknown)}",
                )

        response = {}
        for selection in export_request.selections:
            team = teams_by_id[selection.teamId]
            # Disambiguate duplicate team names with the team id
            key = team.name
            if key in response:
                key = f"{team.name} ({team.id})"
            response[key] = test_service.export_team_data(
                team_id=selection.teamId,
                data_types=selection.dataTypes,
            )

        log_info(
            f"Admin {admin_user_id} exported data for user {target_user_id} "
            f"({len(export_request.selections)} team selection(s))"
        )
    except NotAuthorizedError, HTTPException:
        raise
    except Exception as e:
        log_info("Failed to export user data")
        handle_routes_errors(e)
    return response  # type: ignore[return-value]
