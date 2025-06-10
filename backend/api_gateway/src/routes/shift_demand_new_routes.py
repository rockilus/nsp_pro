from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core import ShiftDemandNew, ShiftDemandSource
from shared.schemas.dto import ShiftDemandNewDTO

from src.dependencies import get_shift_demand_new_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.shift_demand_new_service import ShiftDemandNewService

router = APIRouter()


# pylint: disable=too-many-arguments, too-many-positional-arguments
@router.get("/shift-demands-new/teams/{team_id}/period")
async def get_shift_demands_by_period(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date of the period (YYYY-MM-DD)"),
    buffer_days: int = Query(7, description="Buffer days for navigation"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get shift demands for a specific period with optional buffering."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/matrix")
async def get_shift_demands_matrix(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date of the period (YYYY-MM-DD)"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, Dict[str, int]]:
    """Get shift demands formatted as a matrix for grid display."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demands-new/teams/{team_id}", status_code=201)
async def create_shift_demand(
    team_id: str,
    demand_dto: ShiftDemandNewDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> ShiftDemandNewDTO:
    """Create a new shift demand."""
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create shift demands"
            )

        # Convert DTO to core model
        demand = ShiftDemandNew.from_dto(demand_dto)
        demand.team_id = team_id  # Ensure team_id matches route

        created_demand = service.create_shift_demand(demand)
        return created_demand.to_dto()

    except Exception as e:
        log_info("Failed to create shift demand")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.put("/shift-demands-new/{demand_id}/teams/{team_id}")
async def update_shift_demand(
    team_id: str,
    demand_id: str,
    demand_dto: ShiftDemandNewDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> ShiftDemandNewDTO:
    """Update an existing shift demand."""
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update shift demands"
            )

        # Convert DTO to core model
        demand = ShiftDemandNew.from_dto(demand_dto)
        demand.id = demand_id  # Ensure ID matches route
        demand.team_id = team_id  # Ensure team_id matches route

        updated_demand = service.update_shift_demand(demand)
        return updated_demand.to_dto()

    except Exception as e:
        log_info("Failed to update shift demand")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/shift-demands-new/{demand_id}/teams/{team_id}", status_code=204)
async def delete_shift_demand(
    team_id: str,
    demand_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> None:
    """Delete a shift demand."""
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-demand", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demands-new/teams/{team_id}/bulk-upsert")
async def bulk_upsert_shift_demands(
    team_id: str,
    demands_dto: List[ShiftDemandNewDTO],
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, List[ShiftDemandNewDTO]]:
    """Bulk upsert (create or update) shift demands."""
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create/update shift demands"
            )

        # Convert DTOs to core models
        demands = []
        for demand_dto in demands_dto:
            demand = ShiftDemandNew.from_dto(demand_dto)
            demand.team_id = team_id  # Ensure team_id matches route
            demands.append(demand)

        created, updated = service.bulk_upsert_shift_demands(demands)

        return {
            "created": [demand.to_dto() for demand in created],
            "updated": [demand.to_dto() for demand in updated],
        }

    except Exception as e:
        log_info("Failed to bulk upsert shift demands")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


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
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Copy shift demands from one period to another."""
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/summary")
async def get_team_shift_summary(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, Dict[str, int]]:
    """Get summary statistics for shift demands by shift."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/shifts/{shift_id}")
async def get_demands_by_shift_and_date_range(
    team_id: str,
    shift_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get demands for a specific shift within a date range."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/shift-demands-new/teams/{team_id}/period")
async def delete_demands_by_date_range(
    team_id: str,
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    shift_ids: Optional[List[str]] = Query(
        None, description="Optional shift IDs to filter"
    ),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, int]:
    """Delete demands within a date range, optionally filtered by shifts."""
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-demand", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demands-new/teams/{team_id}/source/{source}")
async def get_demands_by_source(
    team_id: str,
    source: ShiftDemandSource,
    source_id: Optional[str] = Query(None, description="Optional source ID"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> List[ShiftDemandNewDTO]:
    """Get demands by source type and optional source ID."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demands-new/teams/{team_id}/prefetch")
async def prefetch_for_navigation(
    team_id: str,
    current_start: date = Query(..., description="Current period start date"),
    current_end: date = Query(..., description="Current period end date"),
    prefetch_periods: int = Query(2, description="Number of periods to prefetch"),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> Dict[str, str]:
    """Prefetch shift demands for adjacent periods to improve navigation UX."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
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
        raise HTTPException(status_code=500, detail="Internal server error") from e
