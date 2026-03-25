from datetime import date
from typing import Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from shared.logger import log_info
from shared.schemas.core import ShiftDemandNew, ShiftDemandSource
from shared.schemas.dto import (
    ShiftDemandNewCreateDTO,
    ShiftDemandNewDTO,
    ShiftDemandNewUpdateDTO,
    ShiftDemandsResultDTO,
)

from src.dependencies import get_shift_demand_new_service, get_user_context
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.shift_demand_new_service import ShiftDemandNewService

router = APIRouter()


# pylint: disable=too-many-arguments, too-many-positional-arguments
@router.post("/shift-demands-new/teams/{team_id}", status_code=201)
async def create_shift_demand(
    team_id: str,
    demand_dto: ShiftDemandNewCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> ShiftDemandNewDTO:
    """Create a new shift demand."""
    try:
        if not await authz_check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create shift demands"
            )

        # Validate team ID consistency
        if demand_dto.teamId != team_id:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "team_id_mismatch",
                    "message": ("Team ID in path must match team ID in request body"),
                    "path_team_id": team_id,
                    "body_team_id": demand_dto.teamId,
                },
            )

        # Convert create DTO to core model with server-generated fields
        demand = ShiftDemandNew.from_create_dto(demand_dto)

        # Create through service
        created_demand = service.create_shift_demand(demand)

        log_info(f"Created shift demand {created_demand.id} for team {team_id}")
        return created_demand.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error creating shift demand: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "create",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error creating shift demand: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(
        #     status_code=500,
        #     detail={
        #         "error": "internal_error",
        #         "operation": "create",
        #         "message": ("An internal error occurred. Please try again later."),
        #     },
        # ) from e


@router.get("/shift-demands-new/teams/{team_id}/period")
async def get_shift_demands_by_period(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date of the period (YYYY-MM-DD)"),
    buffer_days: int = Query(7, description="Buffer days for navigation"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get shift demands for a specific period with optional buffering."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        demands = service.get_shift_demands_by_period(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            buffer_days=buffer_days,
        )

        return [demand.to_dto() for demand in demands]

    except Exception as e:
        log_info("Failed to get shift demands by period")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/matrix")
async def get_shift_demands_matrix(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date of the period (YYYY-MM-DD)"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, Dict[str, int]]:
    """Get shift demands formatted as a matrix for grid display."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        return service.get_shift_demands_matrix(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )

    except Exception as e:
        log_info("Failed to get shift demands matrix")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.put("/shift-demands-new/{demand_id}/teams/{team_id}", response_model=None)
async def update_shift_demand(
    team_id: str,
    demand_id: str,
    demand_dto: ShiftDemandNewUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Union[ShiftDemandNewDTO, Response]:
    """Update an existing shift demand."""
    try:
        if not await authz_check(
            user_context.user_id, "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update shift demands"
            )

        # Validate team_id consistency if provided in update
        if demand_dto.teamId is not None and demand_dto.teamId != team_id:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "team_change_not_allowed",
                    "message": ("Cannot change team ID through update operation"),
                    "current_team_id": team_id,
                    "requested_team_id": demand_dto.teamId,
                },
            )

        # Get existing demand for validation and update
        existing_demand = service.get_shift_demand_by_id(demand_id)
        if not existing_demand:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Shift demand with ID {demand_id} not found",
                    "demand_id": demand_id,
                },
            )

        # Validate team ownership
        if existing_demand.team_id != team_id:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": ("Shift demand does not belong to specified team"),
                    "demand_id": demand_id,
                    "team_id": team_id,
                },
            )

        # Apply partial update
        existing_demand.update_from_dto(demand_dto)

        # Save through service
        updated_demand = service.update_shift_demand(existing_demand)

        log_info(f"Updated shift demand {demand_id} for team {team_id}")

        # If demand was deleted due to zero count, return 204 No Content
        if updated_demand is None:
            return Response(status_code=204)

        return updated_demand.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error updating shift demand {demand_id}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "update",
                "message": str(e),
                "demand_id": demand_id,
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error updating shift demand {demand_id}: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(
        #     status_code=500,
        #     detail={
        #         "error": "internal_error",
        #         "operation": "update",
        #         "message": ("An internal error occurred. Please try again later."),
        #         "demand_id": demand_id,
        #     },
        # ) from e


@router.delete("/shift-demands-new/{demand_id}/teams/{team_id}", status_code=204)
async def delete_shift_demand(
    team_id: str,
    demand_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> None:
    """Delete a shift demand."""
    try:
        if not await authz_check(
            user_context.user_id, "delete-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete shift demands"
            )

        success = service.delete_shift_demand(demand_id)
        if not success:
            raise HTTPException(
                status_code=404, detail=f"Shift demand {demand_id} not found"
            )

    except Exception as e:
        log_info("Failed to delete shift demand")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demands-new/teams/{team_id}/bulk-upsert")
async def bulk_upsert_shift_demands(
    team_id: str,
    demands_dto: List[ShiftDemandNewCreateDTO],
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> ShiftDemandsResultDTO:
    """Bulk upsert (create or update) shift demands."""
    try:
        if not await authz_check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create/update shift demands"
            )

        # Validate all demands belong to the correct team
        for i, demand_dto in enumerate(demands_dto):
            if demand_dto.teamId != team_id:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "bulk_team_id_mismatch",
                        "message": (
                            f"Demand at index {i}: team ID must match "
                            "route parameter"
                        ),
                        "index": i,
                        "path_team_id": team_id,
                        "body_team_id": demand_dto.teamId,
                    },
                )

        # Convert DTOs to domain models
        demands = [
            ShiftDemandNew.from_create_dto(demand_dto) for demand_dto in demands_dto
        ]

        # Process bulk upsert through service
        created, updated, deleted_ids = service.bulk_upsert_shift_demands(demands)

        # Convert result to response DTO
        return ShiftDemandsResultDTO(
            demandsCreated=[demand.to_dto() for demand in created],
            demandsRead=[],  # Not used in upsert
            demandsUpdated=[demand.to_dto() for demand in updated],
            demandsDeletedIds=deleted_ids,
        )

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error in bulk upsert: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "bulk_upsert",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error in bulk upsert: {str(e)}")
        handle_routes_errors(e)
        # raise HTTPException(
        #     status_code=500,
        #     detail={
        #         "error": "internal_error",
        #         "operation": "bulk_upsert",
        #         "message": ("An internal error occurred. Please try again later."),
        #     },
        # ) from e


@router.post("/shift-demands-new/teams/{team_id}/copy-period")
async def copy_shift_demands_from_period(
    team_id: str,
    source_start: date = Query(..., description="Source period start date"),
    source_end: date = Query(..., description="Source period end date"),
    target_start: date = Query(..., description="Target period start date"),
    target_end: date = Query(..., description="Target period end date"),
    source_type: ShiftDemandSource = Query(
        ShiftDemandSource.TEMPLATE, description="Source type for tracking"
    ),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Copy shift demands from one period to another."""
    try:
        if not await authz_check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create shift demands"
            )

        copied_demands = service.copy_shift_demands_from_period(
            team_id=team_id,
            source_start=source_start,
            source_end=source_end,
            target_start=target_start,
            target_end=target_end,
            source_type=source_type,
        )

        return [demand.to_dto() for demand in copied_demands]

    except Exception as e:
        log_info("Failed to copy shift demands from period")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/summary")
async def get_team_shift_summary(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, Dict[str, int]]:
    """Get summary statistics for shift demands by shift."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        return service.get_team_shift_summary(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )

    except Exception as e:
        log_info("Failed to get team shift summary")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/shifts/{shift_id}")
async def get_demands_by_shift_and_date_range(
    team_id: str,
    shift_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get demands for a specific shift within a date range."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        demands = service.get_demands_by_shift_and_date_range(
            team_id=team_id,
            shift_id=shift_id,
            start_date=start_date,
            end_date=end_date,
        )

        return [demand.to_dto() for demand in demands]

    except Exception as e:
        log_info("Failed to get demands by shift and date range")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/shift-demands-new/teams/{team_id}/period")
async def delete_demands_by_date_range(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    shift_ids: Optional[List[str]] = Query(
        None, description="Optional shift IDs to filter"
    ),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, int]:
    """Delete demands within a date range, optionally filtered by shifts."""
    try:
        if not await authz_check(
            user_context.user_id, "delete-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete shift demands"
            )

        deleted_count = service.delete_demands_by_date_range(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            shift_ids=shift_ids,
        )

        return {"deleted_count": deleted_count}

    except Exception as e:
        log_info("Failed to delete demands by date range")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/source/{source}")
async def get_demands_by_source(
    team_id: str,
    source: ShiftDemandSource,
    source_id: Optional[str] = Query(None, description="Optional source ID"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get demands by source type and optional source ID."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        demands = service.get_demands_by_source(
            team_id=team_id,
            source=source,
            source_id=source_id,
        )

        return [demand.to_dto() for demand in demands]

    except Exception as e:
        log_info("Failed to get demands by source")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demands-new/teams/{team_id}/prefetch")
async def prefetch_for_navigation(
    team_id: str,
    current_start: date = Query(..., description="Current period start date"),
    current_end: date = Query(..., description="Current period end date"),
    prefetch_periods: int = Query(2, description="Number of periods to prefetch"),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, str]:
    """Prefetch shift demands for adjacent periods to improve navigation UX."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read shift demands")

        service.prefetch_for_navigation(
            team_id=team_id,
            current_start=current_start,
            current_end=current_end,
            prefetch_periods=prefetch_periods,
        )

        return {"status": "prefetch completed"}

    except Exception as e:
        log_info("Failed to prefetch for navigation")
        handle_routes_errors(e)
        # raise HTTPException(status_code=500, detail="Internal server error") from e
