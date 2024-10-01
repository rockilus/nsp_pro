from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from constraint_parser.templates import build_templates
from core import Attribute, Template, WorkerProperty
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
from scripts.setup_database import (
    dim_entry_db,
    dimension_db,
    shift_db,
    shift_property_db,
    user_db,
    worker_db,
    worker_dimension_db,
    worker_property_db,
)

router = APIRouter()


# pylint: disable=too-many-locals
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
        user = user_db.get_user_by_id(session.get_user_id())
        workers = worker_db.get_workers_not_deleted(team_id)
        worker_properties = (
            worker_property_db.get_worker_properties_by_worker_ids(
                [w.id for w in workers]
            )
        )
        worker_properties_wd: Dict[str, List[WorkerProperty]] = {}
        for wp in worker_properties:
            wd_id = wp.worker_dimension_id
            if wd_id not in worker_properties_wd:
                worker_properties_wd[wd_id] = []
            worker_properties_wd[wd_id].append(wp)
        worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
        shifts = shift_db.get_shifts_not_deleted(team_id)
        shift_properties = shift_property_db.get_attributes_by_owner_ids(
            [s.id for s in shifts]
        )
        shift_properties_sd: Dict[str, List[Attribute]] = {}
        for sp in shift_properties:
            sd_id = sp.dimension_id
            if sd_id not in shift_properties_sd:
                shift_properties_sd[sd_id] = []
            shift_properties_sd[sd_id].append(sp)
        shift_dimensions = dimension_db.get_shift_dimensions(team_id)
        shift_dim_entries = dim_entry_db.get_dim_entries_by_dim_ids(
            [sd.id for sd in shift_dimensions]
        )
        templates = build_templates(
            workers,
            worker_dimensions,
            worker_properties_wd,
            shifts,
            shift_dimensions,
            shift_dim_entries,
            shift_properties_sd,
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
