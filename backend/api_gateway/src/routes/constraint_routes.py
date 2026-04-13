from typing import List

from fastapi import APIRouter, Depends
from shared.logger import log_info
from shared.schemas.core import (
    ConstraintBuild,
)
from shared.schemas.dto import (
    ConstraintBuildDTO,
)

from src.dependencies import get_constraint_build_service, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.constraint_build_service import ConstraintBuildService

router = APIRouter()


@router.post("/constraints/teams/{team_id}", status_code=201)
async def create_constraint(
    team_id: str,
    req: ConstraintBuildDTO,
    user_context: UserContext = Depends(get_user_context),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ConstraintBuildDTO:
    try:
        if not await authz.check(
            user_context.user_id, "create-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a constraint"
            )
        cb_data = ConstraintBuild.from_dto(req)
        cb_augmented = constraint_build_service.create_constraint_build(cb_data)
        response = cb_augmented.to_dto()
    except Exception as e:
        log_info("Failed to create constraint")
        handle_routes_errors(e)
    return response


@router.get("/constraints/teams/{team_id}")
async def get_constraints(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[ConstraintBuildDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-constraints", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get constraints")
        constraint_builds = constraint_build_service.get_constraint_builds(team_id)
        response = [cb.to_dto() for cb in constraint_builds]
    except Exception as e:
        log_info("Failed to get constraints")
        handle_routes_errors(e)
    return response


@router.put("/constraints/{constraint_build_id}/teams/{team_id}")
async def update_constraint(
    team_id: str,
    updated_constraint_build: ConstraintBuildDTO,
    user_context: UserContext = Depends(get_user_context),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ConstraintBuildDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a constraint"
            )
        cb_data = ConstraintBuild.from_dto(updated_constraint_build)
        cb_updated = constraint_build_service.update_constraint_build(cb_data)
        response = cb_updated.to_dto()
    except Exception as e:
        log_info("Failed to update constraint")
        handle_routes_errors(e)
    return response


@router.delete("/constraints/{constraint_build_id}/teams/{team_id}")
async def delete_constraint(
    constraint_build_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id, "delete-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a constraint"
            )
        constraint_build_service.delete_constraint_build(team_id, constraint_build_id)
    except Exception as e:
        log_info("Failed to delete constraint")
        handle_routes_errors(e)
    return {"message": "Constraint deleted"}
