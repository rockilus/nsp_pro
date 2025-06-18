from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core import ShiftDemandNew, ShiftDemandSource
from shared.schemas.dto import (
    ShiftDemandNewCreateDTO,
    ShiftDemandNewDTO,
    ShiftDemandNewUpdateDTO,
    ShiftDemandsResultDTO,
)

from src.dependencies import get_multitasking_service
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
from shared.schemas.core import ShiftDemandConcurrencyResponse
from shared.schemas.dto import ShiftDemandConcurrencyResponse
from src.services.multitasking_service import MultitaskingService

router = APIRouter()


@router.get(
    "/multitasking/teams/{team_id}/shift-demands",
)
async def get_concurrency_list_shift_demands(
    team_id: str,
    start_date: date = Query(
        ..., description="Start date of the period (YYYY-MM-DD)"
    ),
    end_date: date = Query(
        ..., description="End date of the period (YYYY-MM-DD)"
    ),
    session: SessionContainerType = Depends(authn_verify_session()),
    service: MultitaskingService = Depends(get_multitasking_service),
) -> List[ShiftDemandNewDTO]:
    """Get shift demands for a specific period with optional buffering."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift demands"
            )

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
        raise HTTPException(
            status_code=500, detail="Internal server error"
        ) from e
