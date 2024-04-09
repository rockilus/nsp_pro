from dataclasses import asdict
from typing import List
import time

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
from integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import TemplateMessage

router = APIRouter()


@router.get("/constraint-templates/teams/{team_id}")
async def get_constraint_templates(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[TemplateMessage]:
    start_time = time.time()
    try:
        start_time_authz = time.time()
        if not await authz_check(
            session.get_user_id(), "read-constraint-templates", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get constraint templates"
            )
        end_time_authz = time.time()
        start_time_build_templates = time.time()
        templates = build_templates(team_id)
        end_time_build_templates = time.time()
        start_time_convert = time.time()
        response = [core_to_msg_constraint_template(ct) for ct in templates]
        end_time_convert = time.time()
    except Exception as e:
        log_info("Failed to get constraint templates")
        handle_routes_errors(e)
    end_time = time.time()
    total_time = end_time - start_time
    total_time_authz = end_time_authz - start_time_authz
    total_time_build_templates = (
        end_time_build_templates - start_time_build_templates
    )
    total_time_convert = end_time_convert - start_time_convert
    print(f"Total time constraint templates: {total_time}")
    print(f"Total time to authz:             {total_time_authz}")
    print(f"Total time to build templates:   {total_time_build_templates}")
    print(f"Total time to convert templates: {total_time_convert}")
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
