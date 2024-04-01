from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from constraint_parser.templates import build_templates
from core.constraint import Template
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import TemplateMessage

router = APIRouter()


@router.get("/constraint-templates/teams/{team_id}")
async def get_constraint_templates(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[TemplateMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-constraint-templates", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get constraint templates"
            )
        response = [
            core_to_msg_constraint_template(ct) for ct in build_templates(team_id)
        ]
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
