from datetime import datetime, timezone

import humps
from fastapi import APIRouter, Depends

from core import ExportOptions, ExportPeriodOptions
from errors import (
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import ExportOptionsMessage
from services.export_services import export_schedule_to_excel

router = APIRouter()


# pylint: disable=R0801
@router.post("/export/teams/{team_id}", status_code=201)
async def export_schedule(
    team_id: str,
    export_options: ExportOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> str:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to export a schedule",
            )
        data = msg_to_core_export_options(export_options)
        response = export_schedule_to_excel(team_id, data)
    except Exception as e:
        log_info("Failed to export schedule")
        handle_routes_errors(e)
    return response


# Mappers
# message to core
def msg_to_core_export_options(msg: ExportOptionsMessage) -> ExportOptions:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["period_option"] = ExportPeriodOptions(data_snake["period_option"])
    data_snake["start_date"] = datetime.fromtimestamp(
        data_snake["start_date"], timezone.utc
    ).date()
    data_snake["end_date"] = datetime.fromtimestamp(
        data_snake["end_date"], timezone.utc
    ).date()
    try:
        export_options = ExportOptions(**data_snake)
    except Exception as e:
        log_info("Failed to convert ExportOptionsMessage to ExportOptions")
        handle_create_core_object_error(e)
    return export_options
