from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import DimEntry
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_dim_entry_service
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
from src.routes.api_model import AttributeMessage, DimEntryMessage
from src.routes.attribute_routes import core_to_msg_attribute
from src.services.dim_entry_service import DimEntryService

router = APIRouter()


@router.post("/dim-entries/teams/{team_id}")
async def create_dim_entry(
    team_id: str,
    dim_entry: DimEntryMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    dim_entry_service: DimEntryService = Depends(get_dim_entry_service),
) -> DimEntryMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a dim entry")
        de_data = msg_to_core_dim_entry(dim_entry)
        de_created = dim_entry_service.create_dim_entry(de_data)
        response = core_to_msg_dim_entry(de_created)
    except Exception as e:
        log_info("Failed to create dim entry")
        handle_routes_errors(e)
    return response


@router.put("/dim-entries/{dim_entry_id}/teams/{team_id}")
async def update_dim_entry(
    team_id: str,
    dim_entry: DimEntryMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
) -> DimEntryMessage:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a dim_entry")
        de_data = msg_to_core_dim_entry(dim_entry)
        updated_de = db_collections.dim_entry_db.update_dim_entry(de_data)
        response = core_to_msg_dim_entry(updated_de)
    except Exception as e:
        log_info("Failed to update dim entry")
        handle_routes_errors(e)
    return response


@router.delete("/dim-entries/{dim_entry_id}/teams/{team_id}")
async def delete_dim_entry(
    dim_entry_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    dim_entry_service: DimEntryService = Depends(get_dim_entry_service),
) -> List[AttributeMessage]:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-dimension", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a dim entry",
            )
        sp_updated = dim_entry_service.delete_dim_entry(dim_entry_id)
    except Exception as e:
        log_info("Failed to delete dim entry")
        handle_routes_errors(e)
    return [core_to_msg_attribute(sp) for sp in sp_updated]


# Mappers
# core to message
def core_to_msg_dim_entry(dim_entry: DimEntry) -> DimEntryMessage:
    try:
        data = asdict(dim_entry)
    except Exception as e:
        log_info("Failed to convert DimEntry to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(DimEntryMessage)
    try:
        de_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert DimEntry to DimEntryMessage")
        handle_message_errors(e)
    return de_msg


# message to core
def msg_to_core_dim_entry(msg: DimEntryMessage) -> DimEntry:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        dim_entry = DimEntry(**data_snake)
    except Exception as e:
        log_info("Failed to convert DimEntryMessage to DimEntry")
        handle_create_schema_object_error(e)
    return dim_entry
