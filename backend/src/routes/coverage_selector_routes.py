from dataclasses import asdict
from datetime import datetime
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.coverage import CoverageSelector
from routes.api_model import CoverageSelectorMessage
from scripts.setup_database import coverage_selector_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check

router = APIRouter()


@router.post("/coverage-selectors/teams/{team_id}")
async def create_coverage_selector(
    team_id: str,
    coverage_selector: CoverageSelectorMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageSelectorMessage:
    if not await permit_check(
        session.get_user_id(), "create-coverage-selector", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a coverage selector",
        )
    cs_data = api_msg_to_coverage_selector(coverage_selector)
    cs_created = coverage_selector_db.create_coverage_selector(cs_data)
    return coverage_selector_to_api_msg(cs_created)


@router.get("/coverage-selectors/teams/{team_id}")
async def get_coverage_selectors(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[CoverageSelectorMessage]:
    if not await permit_check(
        session.get_user_id(), "read-coverage-selectors", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get coverage selectors",
        )
    coverage_selectors = coverage_selector_db.get_coverage_selectors(team_id)
    return [coverage_selector_to_api_msg(w) for w in coverage_selectors]


@router.put("/coverage-selectors/{coverage_selector_id}/teams/{team_id}")
async def update_coverage_selector(
    coverage_selector_id: str,
    team_id: str,
    coverage_selector_api: CoverageSelectorMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageSelectorMessage:
    if not await permit_check(
        session.get_user_id(), "update-coverage-selector", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a coverage selector",
        )
    existing_coverage_selector = coverage_selector_db.get_coverage_selector_by_id(
        coverage_selector_id
    )
    if not existing_coverage_selector:
        raise HTTPException(status_code=404, detail="CoverageSelector does not exist")
    coverage_selector_data = api_msg_to_coverage_selector(coverage_selector_api)
    updated_coverage_selector = coverage_selector_db.update_coverage_selector(
        coverage_selector_data
    )
    return coverage_selector_to_api_msg(updated_coverage_selector)


@router.delete("/coverage-selectors/{coverage_selector_id}/teams/{team_id}")
async def delete_coverage_selector(
    coverage_selector_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await permit_check(
        session.get_user_id(), "delete-coverage-selector", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a coverage selector",
        )
    coverage_selector_db.delete_coverage_selector(coverage_selector_id)
    return {"message": "CoverageSelector deleted"}


def coverage_selector_to_api_msg(
    coverage_selector: CoverageSelector,
) -> CoverageSelectorMessage:
    data = asdict(coverage_selector)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageSelectorMessage)
    return validator.validate_python(as_dict)


def api_msg_to_coverage_selector(
    msg: CoverageSelectorMessage,
) -> CoverageSelector:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_date"] = datetime.combine(
        data_snake["start_date"], datetime.min.time()
    )
    data_snake["end_date"] = datetime.combine(
        data_snake["end_date"], datetime.min.time()
    )
    return CoverageSelector(**data_snake)
