from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.shift import ShiftDimension, ShiftProperty
from routes.api_model import NewShiftDimensionMessage, ShiftDimensionMessage
from routes.shift_routes import shift_property_to_api_msg
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check

router = APIRouter()


@router.post("/shift-dimensions/teams/{team_id}")
async def create_shift_dimension(
    team_id: str,
    shift_dimension: ShiftDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> NewShiftDimensionMessage:
    if not await permit_check(
        session.get_user_id(), "create-shift-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a shift dimension",
        )
    sd_data = api_msg_to_shift_dimension(shift_dimension)
    sd_created = shift_dimension_db.create_shift_dimension(sd_data)
    properties = []
    if sd_created.entry_type == "bool":
        shifts = shift_db.get_shifts(team_id)
        for shift in shifts:
            properties.append(
                shift_property_db.create_shift_property(shift, sd_created, False)
            )
    return new_shift_dimension_to_api_msg(sd_created, properties)


@router.get("/shift-dimensions/teams/{team_id}")
async def get_shift_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftDimensionMessage]:
    if not await permit_check(
        session.get_user_id(), "read-shift-dimensions", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to read shift dimensions",
        )
    shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
    return [shift_dimension_to_api_msg(sd) for sd in shift_dimensions]


@router.put("/shift-dimensions/{shift_dimension_id}/teams/{team_id}")
async def update_shift_dimension(
    # pylint: disable=W0613
    shift_dimension_id: str,
    team_id: str,
    shift_dimension: ShiftDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDimensionMessage:
    if not await permit_check(
        session.get_user_id(), "update-shift-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a shift dimension",
        )
    existing_shift_dim = shift_dimension_db.get_shift_dimension_by_id(
        shift_dimension_id
    )
    if not existing_shift_dim:
        raise HTTPException(status_code=404, detail="Shift Dimension does not exist")
    shift_dimension_data = api_msg_to_shift_dimension(shift_dimension)
    updated_shift_dimension = shift_dimension_db.update_shift_dimension(
        shift_dimension_data
    )
    return shift_dimension_to_api_msg(updated_shift_dimension)


@router.delete("/shift-dimensions/{shift_dimension_id}/teams/{team_id}")
async def delete_shift_dimension(
    shift_dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await permit_check(
        session.get_user_id(), "delete-shift-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a shift dimension",
        )
    shift_property_db.delete_shift_properties_by_shift_dimension_id(shift_dimension_id)
    shift_dimension_db.delete_shift_dimension(shift_dimension_id)
    return {"message": "shift deleted"}


def shift_dimension_to_api_msg(
    shift_dimension: ShiftDimension,
) -> ShiftDimensionMessage:
    data = asdict(shift_dimension)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDimensionMessage)
    return validator.validate_python(as_dict)


def new_shift_dimension_to_api_msg(
    shift_dimension: ShiftDimension,
    shift_properties: List[ShiftProperty],
) -> NewShiftDimensionMessage:
    as_dict = {
        "newDimension": shift_dimension_to_api_msg(shift_dimension),
        "newProperties": [shift_property_to_api_msg(sp) for sp in shift_properties],
    }
    validator = TypeAdapter(NewShiftDimensionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_shift_dimension(
    msg: ShiftDimensionMessage,
) -> ShiftDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return ShiftDimension(**data_snake)
