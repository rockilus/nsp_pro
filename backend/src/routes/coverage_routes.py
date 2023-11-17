from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.coverage import Coverage, ShiftDemand
from routes.api_model import CoverageMessage, ShiftDemandMessage
from scripts.setup_database import coverage_db, shift_db, shift_demand_db

router = APIRouter()


@router.post("/coverages", status_code=201)
def create_coverage(req: CoverageMessage) -> CoverageMessage:
    data = api_msg_to_coverage(req)
    cov = coverage_db.create_coverage(name=data.name)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage(cov)
    return coverage_and_shift_demands_to_api_msg(cov, shift_demands)


@router.post("/coverages/{coverage_id}/shift_demands", status_code=201)
def create_shift_demand(
    coverage_id: str,
    req: ShiftDemandMessage,
) -> ShiftDemandMessage:
    data = api_msg_to_shift_demand(req)
    shift = shift_db.get_shift_by_id(data.shift_id)
    coverage = coverage_db.get_coverage_by_id(coverage_id)
    shift_demand = shift_demand_db.create_shift_demand(
        day_index=data.day_index,
        shift=shift,
        quantity=data.quantity,
        start_time=data.start_time,
        duration=data.duration,
        coverage=coverage,
    )
    return shift_demand_to_api_msg(shift_demand)


@router.get("/coverages")
def get_coverages() -> List[CoverageMessage]:
    coverages = coverage_db.get_coverages()
    shift_demands = [
        shift_demand_db.get_shift_demands_by_coverage(coverage)
        for coverage in coverages
    ]
    return [
        coverage_and_shift_demands_to_api_msg(c, sd)
        for c, sd in zip(coverages, shift_demands)
    ]


@router.put("/coverages/{coverage_id}")
def update_coverage(coverage_id: str, updated_coverage: CoverageMessage):
    existing_cov = coverage_db.get_coverage_by_id(coverage_id)
    if not existing_cov:
        raise HTTPException(status_code=404, detail="Coverage does not exist")
    cov_data = api_msg_to_coverage(updated_coverage)
    cov = coverage_db.update_coverage(cov_data)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage(cov)
    return coverage_and_shift_demands_to_api_msg(cov, shift_demands)


@router.put("/coverages/{coverage_id}/shift_demands/{shift_demand_id}")
def update_shift_demand(
    shift_demand_id: str,
    req: ShiftDemandMessage,
) -> ShiftDemandMessage:
    existing_sd = shift_demand_db.get_shift_demand_by_id(shift_demand_id)
    if not existing_sd:
        raise HTTPException(status_code=404, detail="Shift demand does not exist")
    sd_data = api_msg_to_shift_demand(req)
    shift_demand = shift_demand_db.update_shift_demand(sd_data)
    return shift_demand_to_api_msg(shift_demand)


@router.delete("/coverages/{coverage_id}")
def delete_coverage(coverage_id: str):
    shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
    coverage_db.delete_coverage(coverage_id)
    return {"message": "Coverage deleted successfully"}


@router.delete("/coverages/{coverage_id}/shift_demands/{shift_demand_id}")
def delete_shift_demand(shift_demand_id: str):
    shift_demand_db.delete_shift_demand(shift_demand_id)
    return {"message": "Shift demand deleted successfully"}


def shift_demand_to_api_msg(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    data = asdict(shift_demand)
    data["start_time"] = datetime.combine(datetime.now().date(), data["start_time"])
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    return validator.validate_python(as_dict)


def coverage_and_shift_demands_to_api_msg(
    coverage: Coverage, shift_demands: List[ShiftDemand]
) -> CoverageMessage:
    data = asdict(coverage)
    data["shift_demands"] = [shift_demand_to_api_msg(sd) for sd in shift_demands]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageMessage)
    return validator.validate_python(as_dict)


def api_msg_to_coverage(msg: CoverageMessage) -> Coverage:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_demands"}
    return Coverage(**data_snake)


def api_msg_to_shift_demand(msg: ShiftDemandMessage) -> ShiftDemand:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_time"] = data_snake["start_time"].time()
    return ShiftDemand(**data_snake)
