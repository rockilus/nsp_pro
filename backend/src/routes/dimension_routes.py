from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import TypeAdapter

from core import Attribute, Dimension, DimensionEntryType, DimensionType, DimEntry
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import (
    DimensionMessage,
    DimensionsAndDimEntriesMessage,
    DimEntryMessage,
    NewDimensionMessage,
)
from routes.dim_entry_routes import core_to_msg_dim_entry, msg_to_core_dim_entry
from routes.shift_routes import core_to_msg_attribute
from scripts.setup_database import dim_entry_db, dimension_db
from services.dimension_services import create_dimension as create_dimension_service
from services.dimension_services import delete_dimension as delete_dimension_service

router = APIRouter()


@router.post("/dimensions/teams/{team_id}")
async def create_dimension(
    team_id: str,
    dimension: DimensionMessage,
    dim_entries: List[DimEntryMessage],
    session: SessionContainerType = Depends(authn_verify_session()),
) -> NewDimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a dimension")
        d_data = msg_to_core_dimension(dimension)
        des_data = [msg_to_core_dim_entry(de) for de in dim_entries]
        d_created, des_created, attributes = create_dimension_service(d_data, des_data)
        response = core_to_msg_new_dimension(d_created, des_created, attributes)
    except Exception as e:
        log_info("Failed to create dimension")
        handle_routes_errors(e)
    return response


@router.get("/dimensions/teams/{team_id}")
async def get_dimensions(
    team_id: str,
    dim_types_query: List[str] = Query(None, alias="dim_types"),
    session: SessionContainerType = Depends(authn_verify_session()),
) -> DimensionsAndDimEntriesMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift dimensions"
            )
        if dim_types_query is None:
            return core_to_msg_dimensions_and_dim_entries([], [])
        dim_types_int = [int(dt) for dtq in dim_types_query for dt in dtq.split(",")]
        dt_data = [DimensionType(dt) for dt in dim_types_int]
        dimensions = dimension_db.get_dimensions_by_types_not_deleted(dt_data, team_id)
        dim_entries = dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        response = core_to_msg_dimensions_and_dim_entries(dimensions, dim_entries)
    except Exception as e:
        log_info("Failed to get dimensions")
        handle_routes_errors(e)
    return response


@router.get("/dimensions/shift/all/teams/{team_id}")
async def get_all_shift_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[DimensionMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift dimensions"
            )
        shift_dimensions = dimension_db.get_shift_dimensions(team_id)
        response = [core_to_msg_dimension(sd) for sd in shift_dimensions]
    except Exception as e:
        log_info("Failed to get shift dimensions")
        handle_routes_errors(e)
    return response


@router.put("/dimensions/{dimension_id}/teams/{team_id}")
async def update_dimension(
    team_id: str,
    dimension: DimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> DimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a dimension")
        d_data = msg_to_core_dimension(dimension)
        updated_dimension = dimension_db.update_dimension(d_data)
        response = core_to_msg_dimension(updated_dimension)
    except Exception as e:
        log_info("Failed to update dimension")
        handle_routes_errors(e)
    return response


@router.delete("/dimensions/{dimension_id}/teams/{team_id}")
async def delete_dimension(
    dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-dimension", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a dimension",
            )
        delete_dimension_service(dimension_id)
    except Exception as e:
        log_info("Failed to delete dimension")
        handle_routes_errors(e)
    return {"message": "dimension deleted"}


# Mappers
# core to message
def core_to_msg_dimension(dimension: Dimension) -> DimensionMessage:
    try:
        data = asdict(dimension)
    except Exception as e:
        log_info("Failed to convert Dimension to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(DimensionMessage)
    try:
        d_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Dimension to DimensionMessage")
        handle_message_errors(e)
    return d_msg


def core_to_msg_new_dimension(
    dimension: Dimension,
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> NewDimensionMessage:
    try:
        as_dict = {
            "newDimension": core_to_msg_dimension(dimension),
            "newDimEntries": [core_to_msg_dim_entry(de) for de in dim_entries],
            "newAttributes": [
                core_to_msg_attribute(sp) for sp in attributes  # type: ignore
            ],
        }
    except Exception as e:
        log_info(
            "Failed to convert Dimension, DimEntries, and Attributes to dictionary"
        )
        raise MessageTypeError(str(e)) from e
    validator = TypeAdapter(NewDimensionMessage)
    try:
        nd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert Dimension, DimEntries, and Attributes to "
            + "NewDimensionMessage"
        )
        handle_message_errors(e)
    return nd_msg


def core_to_msg_dimensions_and_dim_entries(
    dimensions: List[Dimension], dim_entries: List[DimEntry]
) -> DimensionsAndDimEntriesMessage:
    try:
        as_dict = {
            "dimensions": [core_to_msg_dimension(d) for d in dimensions],
            "dimEntries": [core_to_msg_dim_entry(de) for de in dim_entries],
        }
    except Exception as e:
        log_info("Failed to convert Dimensions and DimEntries to dictionary")
        raise MessageTypeError(str(e)) from e
    validator = TypeAdapter(DimensionsAndDimEntriesMessage)
    try:
        dde_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert Dimensions and DimEntries to "
            + "DimensionsAndDimEntriesMessage"
        )
        handle_message_errors(e)
    return dde_msg


# message to core
def msg_to_core_dimension(msg: DimensionMessage) -> Dimension:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["type"] = DimensionType(data_snake["type"])
    data_snake["entry_type"] = DimensionEntryType(data_snake["entry_type"])
    try:
        dimension = Dimension(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftDimensionMessage to ShiftDimension")
        handle_create_core_object_error(e)
    return dimension
