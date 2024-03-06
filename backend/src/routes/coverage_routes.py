from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.coverage import Coverage, ShiftDemand
from core.shift import Shift
from routes.api_model import CoverageMessage, ShiftDemandMessage
from scripts.setup_database import coverage_db, shift_db, shift_demand_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check

router = APIRouter()


@router.post("/coverages/teams/{team_id}", status_code=201)
async def create_coverage(
    team_id: str,
    coverage: CoverageMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> CoverageMessage:
    if not await permit_check(
        session.get_user_id(), "create-coverage", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a coverage",
        )
    c_data = api_msg_to_coverage(coverage)
    c_created = coverage_db.create_coverage(c_data)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage(c_created)
    shifts = [shift_db.get_shift_by_id(sd.shift_id) for sd in shift_demands]
    return coverage_and_shift_demands_to_api_msg(c_created, shift_demands, shifts)


@router.post("/coverages/{coverage_id}/shift_demands/teams/{team_id}", status_code=201)
async def create_shift_demand(
    team_id: str,
    shift_demand: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    if not await permit_check(
        session.get_user_id(), "create-shift-demand", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a shift demand",
        )
    sd_data = api_msg_to_shift_demand(shift_demand)
    shift = shift_db.get_shift_by_id(sd_data.shift_id)
    sd_created = shift_demand_db.create_shift_demand(sd_data)
    return shift_demand_and_shift_to_api_msg(sd_created, shift)


@router.get("/coverages/teams/{team_id}")
async def get_coverages(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[CoverageMessage]:
    if not await permit_check(session.get_user_id(), "read-coverages", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get coverages",
        )
    coverages = coverage_db.get_coverages(team_id)
    shift_demands = [
        shift_demand_db.get_shift_demands_by_coverage(coverage)
        for coverage in coverages
    ]
    shifts = [
        [shift_db.get_shift_by_id(sd.shift_id) for sd in sds] for sds in shift_demands
    ]
    return [
        coverage_and_shift_demands_to_api_msg(c, sds, ss)
        for c, sds, ss in zip(coverages, shift_demands, shifts)
    ]


@router.put("/coverages/{coverage_id}/teams/{team_id}")
async def update_coverage(
    coverage_id: str,
    team_id: str,
    updated_coverage: CoverageMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(
        session.get_user_id(), "update-coverage", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a coverage",
        )
    existing_cov = coverage_db.get_coverage_by_id(coverage_id)
    if not existing_cov:
        raise HTTPException(status_code=404, detail="Coverage does not exist")
    cov_data = api_msg_to_coverage(updated_coverage)
    cov = coverage_db.update_coverage(cov_data)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage(cov)
    shifts = [shift_db.get_shift_by_id(sd.shift_id) for sd in shift_demands]
    return coverage_and_shift_demands_to_api_msg(cov, shift_demands, shifts)


@router.put("/coverages/{coverage_id}/shift_demands/{shift_demand_id}/teams/{team_id}")
async def update_shift_demand(
    shift_demand_id: str,
    team_id: str,
    req: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    if not await permit_check(
        session.get_user_id(), "update-shift-demand", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a shift demand",
        )
    existing_sd = shift_demand_db.get_shift_demand_by_id(shift_demand_id)
    if not existing_sd:
        raise HTTPException(status_code=404, detail="Shift demand does not exist")
    sd_data = api_msg_to_shift_demand(req)
    shift_demand = shift_demand_db.update_shift_demand(sd_data)
    shift = shift_db.get_shift_by_id(shift_demand.shift_id)
    return shift_demand_and_shift_to_api_msg(shift_demand, shift)


@router.delete("/coverages/{coverage_id}/teams/{team_id}")
async def delete_coverage(
    coverage_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(
        session.get_user_id(), "delete-coverage", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a coverage",
        )
    shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
    coverage_db.delete_coverage(coverage_id)
    return {"message": "Coverage deleted successfully"}


@router.delete(
    "/coverages/{coverage_id}/shift_demands/{shift_demand_id}/teams/{team_id}"
)
async def delete_shift_demand(
    shift_demand_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(
        session.get_user_id(), "delete-shift-demand", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a shift demand",
        )
    shift_demand_db.delete_shift_demand(shift_demand_id)
    return {"message": "Shift demand deleted successfully"}


def shift_demand_to_api_msg(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    data = asdict(shift_demand)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    return validator.validate_python(as_dict)


def shift_demand_and_shift_to_api_msg(
    shift_demand: ShiftDemand, shift: Shift
) -> ShiftDemandMessage:
    data = asdict(shift_demand)
    data["shift"] = asdict(shift)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    return validator.validate_python(as_dict)


def coverage_and_shift_demands_to_api_msg(
    coverage: Coverage, shift_demands: List[ShiftDemand], shifts: List[Shift]
) -> CoverageMessage:
    data = asdict(coverage)
    data["shift_demands"] = [
        shift_demand_and_shift_to_api_msg(sd, s) for sd, s in zip(shift_demands, shifts)
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageMessage)
    return validator.validate_python(as_dict)


def api_msg_to_coverage(msg: CoverageMessage) -> Coverage:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_demands"}
    return Coverage(**data_snake)


def api_msg_to_shift_demand(msg: ShiftDemandMessage) -> ShiftDemand:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["shift_id"] = data_snake["shift"]["id"]
    data_snake = {k: v for k, v in data_snake.items() if k != "shift"}
    return ShiftDemand(**data_snake)
