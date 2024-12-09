from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import Specialty
from shared.schemas.errors import handle_create_schema_object_error

from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import SpecialtyMessage, WorkerMessage
from routes.worker_routes import core_to_msg_worker_and_attributes
from scripts.setup_database import attribute_db, specialty_db
from services.team_services import delete_specialty as delete_specialty_service

router = APIRouter()


@router.post("/specialties/teams/{team_id}")
async def create_specialty(
    team_id: str,
    specialty: SpecialtyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> SpecialtyMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a specialty")
        s_data = msg_to_core_specialty(specialty)
        de_created = specialty_db.create_specialty(s_data)
        response = core_to_msg_specialty(de_created)
    except Exception as e:
        log_info("Failed to create specialty")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.get("/specialties/teams/{team_id}")
async def get_specialties(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[SpecialtyMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-workers", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read specialties")
        specialties = specialty_db.get_specialties_by_team_id(team_id)
        response = [core_to_msg_specialty(sp) for sp in specialties]
    except Exception as e:
        log_info("Failed to get specialties")
        handle_routes_errors(e)
    return response


@router.put("/specialties/{specialty_id}/teams/{team_id}")
async def update_specialty(
    team_id: str,
    specialty: SpecialtyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> SpecialtyMessage:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a specialty")
        de_data = msg_to_core_specialty(specialty)
        updated_de = specialty_db.update_specialty(de_data)
        response = core_to_msg_specialty(updated_de)
    except Exception as e:
        log_info("Failed to update specialty")
        handle_routes_errors(e)
    return response


@router.delete("/specialties/{specialty_id}/teams/{team_id}")
async def delete_specialty(
    specialty_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerMessage]:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-dimension", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a specialty",
            )
        workers_updated = delete_specialty_service(specialty_id)
        attributes = [
            attribute_db.get_attributes_by_owner_id(w.id) for w in workers_updated
        ]
        response = [
            core_to_msg_worker_and_attributes(w, wp)
            for w, wp in zip(workers_updated, attributes)
        ]
    except Exception as e:
        log_info("Failed to delete specialty")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_specialty(specialty: Specialty) -> SpecialtyMessage:
    try:
        data = asdict(specialty)
    except Exception as e:
        log_info("Failed to convert Specialty to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(SpecialtyMessage)
    try:
        de_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Specialty to SpecialtyMessage")
        handle_message_errors(e)
    return de_msg


# message to core
def msg_to_core_specialty(msg: SpecialtyMessage) -> Specialty:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        specialty = Specialty(**data_snake)
    except Exception as e:
        log_info("Failed to convert SpecialtyMessage to Specialty")
        handle_create_schema_object_error(e)
    return specialty
