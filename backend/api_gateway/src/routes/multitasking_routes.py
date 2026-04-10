from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from shared.logger import log_info
from shared.schemas.core import ShiftDemandConcurrencyRequest
from shared.schemas.dto import (
    ShiftDemandConcurrencyRequestDTO,
    ShiftDemandConcurrencyResponseDTO,
)
from shared.schemas.dto.multitasking import (
    CreateMultitaskingGroupRequest,
    MultitaskingGroupDTO,
    UpdateMultitaskingGroupRequest,
)

from src.dependencies import (
    get_cerbos_authz_service,
    get_multitasking_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.multitasking_service import MultitaskingService

router = APIRouter()


@router.post(
    "/multitasking/shift-demand-concurrency",
    response_model=ShiftDemandConcurrencyResponseDTO,
    summary="Get shift demand concurrency data",
    description=(
        "Retrieves data about which shift demands can be worked concurrently "
        "within the specified date range. This helps identify shifts "
        "that can be assigned to the same worker without conflicts."
    ),
)
async def get_shift_demand_concurrency(
    request: ShiftDemandConcurrencyRequestDTO,
    user_context: UserContext = Depends(get_user_context),
    service: MultitaskingService = Depends(get_multitasking_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ShiftDemandConcurrencyResponseDTO:
    """Get shift demand concurrency data for a team within a date range."""
    try:
        # Convert DTO to core model for validation
        core_request = ShiftDemandConcurrencyRequest.from_dto(request)

        # Check authorization
        if not await authz.check(
            user_context.user_id,
            "read-shift-demands",  # concurrency data falls under shift-demand reads
            "team",
            core_request.team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift demands for this team"
            )

        # Generate concurrency data
        response = service.generate_shift_demand_concurrency_list(
            team_id=core_request.team_id,
            start_date=core_request.start_date,
            end_date=core_request.end_date,
        )

        return response.to_dto()

    except ValueError as e:
        log_info(f"Validation error in get_shift_demand_concurrency: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Invalid request data: {str(e)}"
        ) from e
    except NotAuthorizedError as e:
        log_info(
            f"Authorization error in get_shift_demand_concurrency: {str(e)}"
        )
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to get shift demand concurrency: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post(
    "/multitasking/groups",
    response_model=MultitaskingGroupDTO,
    summary="Create multitasking group(s)",
    description="Create a new multitasking group and return all groups for the team.",
)
async def create_multitasking_group(
    request: CreateMultitaskingGroupRequest,
    user_context: UserContext = Depends(get_user_context),
    service: MultitaskingService = Depends(get_multitasking_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> MultitaskingGroupDTO:
    """Create a multitasking group and return all groups for the team."""
    try:
        # Authorization: user must be able to manage multitasking groups for the team
        if not await authz.check(
            user_context.user_id,
            "create-multitasking-group",
            "team",
            request.teamId,
        ):
            raise NotAuthorizedError(
                "You do not have permission to manage multitasking groups for this team"
            )
        group = service.create_multitasking(request)
        return group.to_dto()
    except ValueError as e:
        log_info(f"Validation error in create_multitasking_group: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Invalid request data: {str(e)}"
        ) from e
    except NotAuthorizedError as e:
        log_info(f"Authorization error in create_multitasking_group: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to create multitasking group: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.put(
    "/multitasking/teams/{team_id}/groups/{group_id}",
    response_model=List[MultitaskingGroupDTO],
    summary="Update multitasking group(s)",
    description="Update a multitasking group and return all groups for the team.",
)
async def update_multitasking_group(
    team_id: str,
    request: UpdateMultitaskingGroupRequest,
    user_context: UserContext = Depends(get_user_context),
    service: MultitaskingService = Depends(get_multitasking_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> MultitaskingGroupDTO:
    """Update a multitasking group and return all groups for the team."""
    try:
        # Authorization: user must be able to manage multitasking groups for the team
        if not await authz.check(
            user_context.user_id,
            "update-multitasking-group",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to manage multitasking groups for this team"
            )
        group_updated = service.update_multitasking(request)
        return group_updated.to_dto()
    except ValueError as e:
        log_info(f"Validation error in update_multitasking_group: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Invalid request data: {str(e)}"
        ) from e
    except NotAuthorizedError as e:
        log_info(f"Authorization error in update_multitasking_group: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to update multitasking group: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get(
    "/multitasking/teams/{team_id}/groups",
    response_model=List[MultitaskingGroupDTO],
    summary="Get multitasking groups",
    description="Get all multitasking groups for a team, optionally filtered by "
    + "template.",
)
async def get_multitasking_groups(
    team_id: str,
    template_id: Optional[str] = None,
    user_context: UserContext = Depends(get_user_context),
    service: MultitaskingService = Depends(get_multitasking_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[MultitaskingGroupDTO]:
    """Get all multitasking groups for a team, optionally filtered by template."""
    try:
        if not await authz.check(
            user_context.user_id,
            "read-multitasking-groups",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to view multitasking groups for this team"
            )
        groups = service.get_multitaskings(
            team_id=team_id, template_id=template_id
        )
        return [g.to_dto() for g in groups]
    except NotAuthorizedError as e:
        log_info(f"Authorization error in get_multitasking_groups: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to get multitasking groups: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete(
    "/multitasking/teams/{team_id}/groups/{group_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete multitasking group",
    description="Delete a multitasking group and return confirmation.",
)
async def delete_multitasking_group(
    team_id: str,
    group_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: MultitaskingService = Depends(get_multitasking_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> Dict[str, str | bool]:
    """Delete a multitasking group and return confirmation."""
    try:
        if not await authz.check(
            user_context.user_id,
            "delete-multitasking-group",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to manage multitasking groups for this team"
            )
        service.delete_multitasking(group_id)
        return {"success": True, "message": "Multitasking group deleted."}
    except NotAuthorizedError as e:
        log_info(f"Authorization error in delete_multitasking_group: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to delete multitasking group: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e
