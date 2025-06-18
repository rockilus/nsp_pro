from fastapi import APIRouter, Depends, HTTPException
from shared.logger import log_info
from shared.schemas.core import (
    ShiftDemandConcurrencyRequest,
)
from shared.schemas.dto import (
    ShiftDemandConcurrencyRequestDTO,
    ShiftDemandConcurrencyResponseDTO,
)

from src.dependencies import get_multitasking_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
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
    session: SessionContainerType = Depends(authn_verify_session()),
    service: MultitaskingService = Depends(get_multitasking_service),
) -> ShiftDemandConcurrencyResponseDTO:
    """Get shift demand concurrency data for a team within a date range."""
    try:
        # Convert DTO to core model for validation
        core_request = ShiftDemandConcurrencyRequest.from_dto(request)

        # Check authorization
        if not await authz_check(
            session.get_user_id(),
            "read-shift-demands",
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
        log_info(f"Authorization error in get_shift_demand_concurrency: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to get shift demand concurrency: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e
