from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from shared.logger import log_info
from shared.schemas.core import ExportOptions
from shared.schemas.dto import ExportOptionsDTO

from src.dependencies import get_schedule_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.schedule_service import ScheduleService

router = APIRouter()


# pylint: disable=R0801
@router.post("/export/teams/{team_id}", status_code=201)
async def export_schedule(
    team_id: str,
    export_options: ExportOptionsDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> StreamingResponse:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule-export", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to export a schedule",
            )
        data = ExportOptions.from_dto(export_options)
        workbook = schedule_service.export_schedule_to_excel(team_id, data)

        # Convert the workbook to a binary stream
        stream = BytesIO()
        workbook.save(stream)
        stream.seek(0)

        # Create a StreamingResponse to send the file
        response = StreamingResponse(
            stream,
            media_type="application/"
            + "vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response.headers["Content-Disposition"] = (
            f"attachment; filename=schedule_{team_id}.xlsx"
        )
        return response
    except Exception as e:
        log_info("Failed to export schedule")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Failed to export schedule") from e
