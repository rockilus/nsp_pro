from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import Coverage
from shared.schemas.errors import handle_create_schema_object_error

from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import CoverageMessage
from scripts.setup_database import coverage_db
from services.coverage_services import delete_coverage as delete_coverage_service

router = APIRouter()


@router.post("/coverages/teams/{team_id}", status_code=201)
async def create_coverage(
    team_id: str,
    coverage: CoverageMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-coverage", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a coverage")
        c_data = msg_to_core_coverage(coverage)
        c_created = coverage_db.create_coverage(c_data)
        response = core_to_msg_coverage(c_created)
    except Exception as e:
        log_info("Failed to create coverage")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.get("/coverages/teams/{team_id}")
async def get_coverages(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[CoverageMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-coverages", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get coverages")
        coverages = coverage_db.get_coverages(team_id)
        response = [core_to_msg_coverage(c) for c in coverages]
    except Exception as e:
        log_info("Failed to get coverages")
        handle_routes_errors(e)
    return response


@router.put("/coverages/{coverage_id}/teams/{team_id}")
async def update_coverage(
    team_id: str,
    updated_coverage: CoverageMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    try:
        if not await authz_check(
            session.get_user_id(), "update-coverage", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a coverage")
        cov_data = msg_to_core_coverage(updated_coverage)
        cov = coverage_db.update_coverage(cov_data)
        response = core_to_msg_coverage(cov)
    except Exception as e:
        log_info("Failed to update coverage")
        handle_routes_errors(e)
    return response


@router.delete("/coverages/{coverage_id}/teams/{team_id}")
async def delete_coverage(
    coverage_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    try:
        if not await authz_check(
            session.get_user_id(), "delete-coverage", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete a coverage")
        delete_coverage_service(coverage_id)
    except Exception as e:
        log_info("Failed to delete coverage")
        handle_routes_errors(e)
    return {"message": "Coverage deleted successfully"}


# Mappers
# core to message
def core_to_msg_coverage(
    coverage: Coverage,
) -> CoverageMessage:
    try:
        data = asdict(coverage)
    except Exception as e:
        log_info("Failed to convert Coverage to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageMessage)
    try:
        c_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Coverage to CoverageMessage")
        handle_message_errors(e)
    return c_msg


# message to core
def msg_to_core_coverage(msg: CoverageMessage) -> Coverage:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        coverage = Coverage(**data_snake)
    except Exception as e:
        log_info("Failed to convert CoverageMessage to Coverage")
        handle_create_schema_object_error(e)
    return coverage
