from dataclasses import asdict
from datetime import datetime
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import CoverageSelector
from shared.schemas.errors import handle_create_schema_object_error

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
from routes.api_model import CoverageSelectorMessage
from scripts.setup_database import coverage_selector_db
from services.coverage_selector_services import (
    update_coverage_selector as update_coverage_selector_service,
)
from services.coverage_selector_services import (
    delete_coverage_selector as delete_coverage_selector_service,
)

router = APIRouter()


@router.post("/coverage-selectors/teams/{team_id}")
async def create_coverage_selector(
    team_id: str,
    coverage_selector: CoverageSelectorMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageSelectorMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-coverage-selector", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a coverage selector"
            )
        cs_data = msg_to_core_coverage_selector(coverage_selector)
        cs_created = coverage_selector_db.create_coverage_selector(cs_data)
        response = core_to_msg_coverage_selector(cs_created)
    except Exception as e:
        log_info("Failed to create coverage selector")
        handle_routes_errors(e)
    return response


@router.get("/coverage-selectors/schedules/{schedule_id}/teams/{team_id}")
async def get_coverage_selectors(
    team_id: str,
    schedule_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[CoverageSelectorMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-coverage-selectors", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get coverage selectors"
            )
        coverage_selectors = coverage_selector_db.get_coverage_selectors(
            schedule_id
        )
        response = [
            core_to_msg_coverage_selector(w) for w in coverage_selectors
        ]
    except Exception as e:
        log_info("Failed to get coverage selectors")
        handle_routes_errors(e)
    return response


@router.put("/coverage-selectors/{coverage_selector_id}/teams/{team_id}")
async def update_coverage_selector(
    coverage_selector_id: str,
    team_id: str,
    coverage_selector_api: CoverageSelectorMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageSelectorMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-coverage-selector", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a coverage selector"
            )
        coverage_selector_data = msg_to_core_coverage_selector(
            coverage_selector_api
        )
        updated_coverage_selector = update_coverage_selector_service(
            coverage_selector_data
        )
        response = core_to_msg_coverage_selector(updated_coverage_selector)
    except Exception as e:
        log_info("Failed to update coverage selector")
        handle_routes_errors(e)
    return response


@router.delete("/coverage-selectors/{coverage_selector_id}/teams/{team_id}")
async def delete_coverage_selector(
    coverage_selector_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-coverage-selector", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a coverage selector"
            )
        delete_coverage_selector_service(coverage_selector_id)
    except Exception as e:
        log_info("Failed to delete coverage selector")
        handle_routes_errors(e)
    return {"message": "CoverageSelector deleted"}


# Mappers
# core to message
def core_to_msg_coverage_selector(
    coverage_selector: CoverageSelector,
) -> CoverageSelectorMessage:
    try:
        data = asdict(coverage_selector)
    except Exception as e:
        log_info("Failed to convert CoverageSelector to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageSelectorMessage)
    try:
        cs_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert CoverageSelector to CoverageSelectorMessage"
        )
        handle_message_errors(e)
    return cs_msg


# message to core
def msg_to_core_coverage_selector(
    msg: CoverageSelectorMessage,
) -> CoverageSelector:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_date"] = datetime.combine(
        data_snake["start_date"], datetime.min.time()
    )
    data_snake["end_date"] = datetime.combine(
        data_snake["end_date"], datetime.min.time()
    )
    try:
        coverage_selector = CoverageSelector(**data_snake)
    except Exception as e:
        log_info(
            "Failed to create CoverageSelector from CoverageSelectorMessage"
        )
        handle_create_schema_object_error(e)
    return coverage_selector
