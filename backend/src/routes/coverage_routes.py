from dataclasses import asdict
from typing import List

import humps
from core import Coverage, Shift, ShiftDemand
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from fastapi import APIRouter, Depends
from integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from integrations.authorization import authz_check
from logger import log_info
from pydantic import TypeAdapter
from routes.api_model import CoverageMessage, ShiftDemandMessage
from scripts.setup_database import coverage_db, shift_db, shift_demand_db

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
            raise NotAuthorizedError(
                "You do not have permission to create a coverage"
            )
        c_data = msg_to_core_coverage(coverage)
        c_created = coverage_db.create_coverage(c_data)
        shift_demands = shift_demand_db.get_shift_demands_by_coverage(
            c_created
        )
        shifts = [
            shift_db.get_shift_by_id(sd.shift_id) for sd in shift_demands
        ]
        response = core_to_msg_coverage_and_shift_demands(
            c_created, shift_demands, shifts
        )
    except Exception as e:
        log_info("Failed to create coverage")
        handle_routes_errors(e)
    return response


@router.post(
    "/coverages/{coverage_id}/shift_demands/teams/{team_id}", status_code=201
)
async def create_shift_demand(
    team_id: str,
    shift_demand: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a shift demand",
            )
        sd_data = msg_to_core_shift_demand(shift_demand)
        shift = shift_db.get_shift_by_id(sd_data.shift_id)
        sd_created = shift_demand_db.create_shift_demand(sd_data)
        response = core_to_msg_shift_demand_and_shift(sd_created, shift)
    except Exception as e:
        log_info("Failed to create shift demand")
        handle_routes_errors(e)
    return response


@router.get("/coverages/teams/{team_id}")
async def get_coverages(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[CoverageMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-coverages", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get coverages"
            )
        coverages = coverage_db.get_coverages(team_id)
        shift_demands = [
            shift_demand_db.get_shift_demands_by_coverage(coverage)
            for coverage in coverages
        ]
        shifts = [
            [shift_db.get_shift_by_id(sd.shift_id) for sd in sds]
            for sds in shift_demands
        ]
        response = [
            core_to_msg_coverage_and_shift_demands(c, sds, ss)
            for c, sds, ss in zip(coverages, shift_demands, shifts)
        ]
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
            raise NotAuthorizedError(
                "You do not have permission to update a coverage"
            )
        cov_data = msg_to_core_coverage(updated_coverage)
        cov = coverage_db.update_coverage(cov_data)
        shift_demands = shift_demand_db.get_shift_demands_by_coverage(cov)
        shifts = [
            shift_db.get_shift_by_id(sd.shift_id) for sd in shift_demands
        ]
        response = core_to_msg_coverage_and_shift_demands(
            cov, shift_demands, shifts
        )
    except Exception as e:
        log_info("Failed to update coverage")
        handle_routes_errors(e)
    return response


@router.put(
    "/coverages/{coverage_id}/shift_demands/{shift_demand_id}/teams/{team_id}"
)
async def update_shift_demand(
    team_id: str,
    req: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a shift demand",
            )
        sd_data = msg_to_core_shift_demand(req)
        shift_demand = shift_demand_db.update_shift_demand(sd_data)
        shift = shift_db.get_shift_by_id(shift_demand.shift_id)
        response = core_to_msg_shift_demand_and_shift(shift_demand, shift)
    except Exception as e:
        log_info("Failed to update shift demand")
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
            raise NotAuthorizedError(
                "You do not have permission to delete a coverage"
            )
        shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
        coverage_db.delete_coverage(coverage_id)
    except Exception as e:
        log_info("Failed to delete coverage")
        handle_routes_errors(e)
    return {"message": "Coverage deleted successfully"}


@router.delete(
    "/coverages/{coverage_id}/shift_demands/{shift_demand_id}/teams/{team_id}"
)
async def delete_shift_demand(
    shift_demand_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await authz_check(
        session.get_user_id(), "delete-shift-demand", "team", team_id
    ):
        raise NotAuthorizedError(
            "You do not have permission to delete a shift demand"
        )
    shift_demand_db.delete_shift_demand(shift_demand_id)
    return {"message": "Shift demand deleted successfully"}


# Mappers
# core to message
def core_to_msg_shift_demand(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    try:
        data = asdict(shift_demand)
    except Exception as e:
        log_info("Failed to convert ShiftDemand to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    try:
        sd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert ShiftDemand to ShiftDemandMessage")
        handle_message_errors(e)
    return sd_msg


def core_to_msg_shift_demand_and_shift(
    shift_demand: ShiftDemand, shift: Shift
) -> ShiftDemandMessage:
    try:
        data = asdict(shift_demand)
        data["shift"] = asdict(shift)
        data["shift"]["shift_properties"] = []
    except Exception as e:
        log_info("Failed to convert ShiftDemand and Shift to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    try:
        sd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert ShiftDemand and Shift to ShiftDemandMessage"
        )
        handle_message_errors(e)
    return sd_msg


def core_to_msg_coverage_and_shift_demands(
    coverage: Coverage, shift_demands: List[ShiftDemand], shifts: List[Shift]
) -> CoverageMessage:
    try:
        data = asdict(coverage)
    except Exception as e:
        log_info("Failed to convert Coverage to dictionary")
        raise MessageTypeError(str(e)) from e
    data["shift_demands"] = [
        core_to_msg_shift_demand_and_shift(sd, s)
        for sd, s in zip(shift_demands, shifts)
    ]
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
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_demands"}
    try:
        coverage = Coverage(**data_snake)
    except Exception as e:
        log_info("Failed to convert CoverageMessage to Coverage")
        handle_create_core_object_error(e)
    return coverage


def msg_to_core_shift_demand(msg: ShiftDemandMessage) -> ShiftDemand:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["shift_id"] = data_snake["shift"]["id"]
    data_snake = {k: v for k, v in data_snake.items() if k != "shift"}
    try:
        shift_demand = ShiftDemand(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftDemandMessage to ShiftDemand")
        handle_create_core_object_error(e)
    return shift_demand
