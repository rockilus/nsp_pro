from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import LinkShift
from shared.schemas.errors import handle_create_schema_object_error

from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import LinkShiftMessage
from src.scripts.setup_database import link_shift_db
from src.services.link_shift_services import (
    create_link_shift as create_link_shift_service,
)
from src.services.link_shift_services import (
    update_link_shift as update_link_shift_service,
)

router = APIRouter()


@router.post("/link-shifts/teams/{team_id}")
async def create_link_shift(
    team_id: str,
    link_shift: LinkShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> LinkShiftMessage:
    try:
        if not await authz_check(
            # session.get_user_id(), "create-link-shift", "team", team_id
            session.get_user_id(),
            "create-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a link shift"
            )
        ls_data = msg_to_core_link_shift(link_shift)
        link_shift_created = create_link_shift_service(ls_data)
        response = core_to_msg_link_shift(link_shift_created)
    except Exception as e:
        log_info("Failed to create link_shift")
        handle_routes_errors(e)
    return response


@router.get("/link-shifts/teams/{team_id}")
async def get_link_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[LinkShiftMessage]:
    try:
        if not await authz_check(
            # session.get_user_id(), "read-link-shifts", "team", team_id
            session.get_user_id(),
            "read-shifts",
            "team",
            team_id,
        ):
            raise NotAuthorizedError("You do not have permission to get link shifts")
        link_shifts = link_shift_db.get_link_shifts(team_id)
        response = [core_to_msg_link_shift(ls) for ls in link_shifts]
    except Exception as e:
        log_info("Failed to get link shifts")
        handle_routes_errors(e)
    return response


@router.put("/link-shifts/{link_shift_id}/teams/{team_id}")
async def update_link_shift(
    team_id: str,
    link_shift: LinkShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> LinkShiftMessage:
    try:
        if not await authz_check(
            # session.get_user_id(), "update-link-shift", "team", team_id
            session.get_user_id(),
            "update-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a link shift"
            )
        ls_data = msg_to_core_link_shift(link_shift)
        ls_updated = update_link_shift_service(ls_data)
        response = core_to_msg_link_shift(ls_updated)
    except Exception as e:
        log_info("Failed to update link shift")
        handle_routes_errors(e)
    return response


@router.delete("/link-shifts/{link_shift_id}/teams/{team_id}")
async def delete_link_shift(
    link_shift_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            # session.get_user_id(), "delete-link-shift", "team", team_id
            session.get_user_id(),
            "delete-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a link shift"
            )
        link_shift_db.delete_link_shift(link_shift_id)
    except Exception as e:
        log_info("Failed to delete link shift")
        handle_routes_errors(e)
    return {"message": "LinkShift deleted"}


# Mappers
# core to message
def core_to_msg_link_shift(link_shift: LinkShift) -> LinkShiftMessage:
    try:
        data = asdict(link_shift)
    except Exception as e:
        log_info("Failed to convert LinkShift to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(LinkShiftMessage)
    try:
        ls_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert LinkShift to LinkShiftMessage")
        handle_message_errors(e)
    return ls_msg


# message to core
def msg_to_core_link_shift(msg: LinkShiftMessage) -> LinkShift:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        link_shift = LinkShift(**data_snake)
    except Exception as e:
        log_info("Failed to convert LinkShiftMessage to LinkShift")
        handle_create_schema_object_error(e)
    return link_shift
