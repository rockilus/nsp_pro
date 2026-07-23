from typing import List

from fastapi import APIRouter, Depends
from shared.schemas.core import (
    RotationBreakBehavior,
)
from shared.schemas.dto import (
    AssignmentsRecurrencesResultDTO,
    RotationBreakRequestDTO,
    RotationCreateDTO,
    RotationDTO,
    RotationUpdateDTO,
)

from src.dependencies import (
    get_cerbos_authz_service,
    get_rotation_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.rotation_service import RotationService

router = APIRouter()


@router.post("/rotations/teams/{team_id}", status_code=201)
async def create_rotation(
    team_id: str,
    data: RotationCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> RotationDTO:
    try:
        if not await authz.check(
            user_context.user_id, "create-rotation", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to create rotations "
                f"in team {team_id}"
            )
        rotation = rotation_service.create_rotation(team_id, data)
        return rotation.to_dto()
    except Exception as e:
        handle_routes_errors(e)


@router.get("/rotations/teams/{team_id}")
async def get_rotations(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[RotationDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-rotation", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to read rotations "
                f"in team {team_id}"
            )
        rotations = rotation_service.get_rotations_by_team(team_id)
        return [r.to_dto() for r in rotations]
    except Exception as e:
        handle_routes_errors(e)


@router.get("/rotations/{rotation_id}/teams/{team_id}")
async def get_rotation(
    rotation_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> RotationDTO:
    try:
        if not await authz.check(
            user_context.user_id, "read-rotation", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to read rotation "
                f"{rotation_id} in team {team_id}"
            )
        rotation = rotation_service.get_rotation(rotation_id, team_id)
        return rotation.to_dto()
    except Exception as e:
        handle_routes_errors(e)


@router.put("/rotations/{rotation_id}/teams/{team_id}")
async def update_rotation(
    rotation_id: str,
    team_id: str,
    data: RotationUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> RotationDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-rotation", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to update rotation "
                f"{rotation_id} in team {team_id}"
            )
        rotation = rotation_service.update_rotation(rotation_id, team_id, data)
        return rotation.to_dto()
    except Exception as e:
        handle_routes_errors(e)


@router.delete("/rotations/{rotation_id}/teams/{team_id}")
async def delete_rotation(
    rotation_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> dict:
    try:
        if not await authz.check(
            user_context.user_id, "delete-rotation", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to delete rotation "
                f"{rotation_id} in team {team_id}"
            )
        rotation_service.delete_rotation(rotation_id, team_id)
        return {"message": "Rotation deleted successfully"}
    except Exception as e:
        handle_routes_errors(e)


@router.post("/assignments/{assignment_id}/rotation-break/teams/{team_id}")
async def handle_rotation_break(
    assignment_id: str,
    team_id: str,
    data: RotationBreakRequestDTO,
    user_context: UserContext = Depends(get_user_context),
    rotation_service: RotationService = Depends(get_rotation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                f"User {user_context.user_id} not authorized to update assignment "
                f"{assignment_id} in team {team_id}"
            )
        result = rotation_service.handle_rotation_break(
            assignment_id=assignment_id,
            team_id=team_id,
            behavior=RotationBreakBehavior(data.behavior),
            new_worker_id=data.newWorkerId,
        )
        return result.to_dto()
    except Exception as e:
        handle_routes_errors(e)
