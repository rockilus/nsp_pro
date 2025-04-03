from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import Template
from shared.schemas.errors import UserNotFoundError

from src.dependencies import get_data_fetching_service
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
from src.routes.api_model import TemplateMessage
from src.scripts.setup_database import user_db
from src.services import DataFetchingService
from src.utils.constraint_utils import build_templates

router = APIRouter()


# pylint: disable=too-many-locals
@router.get("/constraint-templates/teams/{team_id}")
async def get_constraint_templates(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    data_fetching_service: DataFetchingService = Depends(get_data_fetching_service),
) -> List[TemplateMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-constraint-templates", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get constraint templates"
            )
        user_id = session.get_user_id()
        user = user_db.get_user_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User with id {user_id} not found")
        # pylint: disable=R0801
        (workers, shifts, dimensions, dim_entries, attributes, specialties) = (
            # fmt: off
            data_fetching_service
            .fetch_workers_not_d_shifts_not_d_dim_not_d_attributes_spes(
                team_id
            )
            # fmt: on
        )
        templates = build_templates(
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
            user.language,
        )
        response = [core_to_msg_constraint_template(ct) for ct in templates]
    except Exception as e:
        log_info("Failed to get constraint templates")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_constraint_template(
    constraint_template: Template,
) -> TemplateMessage:
    try:
        data = asdict(constraint_template)
    except Exception as e:
        log_info("Failed to convert core Template to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TemplateMessage)
    try:
        t_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core Template to TemplateMessage")
        handle_message_errors(e)
    return t_msg
