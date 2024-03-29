from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from constraint_parser.templates import build_templates
from core.constraint import Template
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import TemplateMessage

router = APIRouter()


@router.get("/constraint-templates/teams/{team_id}")
async def get_constraint_templates(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[TemplateMessage]:
    if not await authz_check(
        session.get_user_id(), "read-constraint-templates", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get constraint templates",
        )
    return [constraint_template_to_api_msg(ct) for ct in build_templates(team_id)]


def constraint_template_to_api_msg(
    constraint_template: Template,
) -> TemplateMessage:
    data = asdict(constraint_template)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TemplateMessage)
    return validator.validate_python(as_dict)
