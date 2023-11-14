from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.coverage import Coverage, ShiftDemand
from routes.api_model import CoverageMessage, CreateCoverageRequest, ShiftDemandMessage
from scripts.setup_database import coverage_db

router = APIRouter()


@router.get("/coverages")
def get_coverages() -> List[CoverageMessage]:
    coverages = coverage_db.get_coverages()
    return [coverage_to_api_msg(c) for c in coverages]


@router.post("/coverages", status_code=201)
def create_coverage(req: CreateCoverageRequest) -> CoverageMessage:
    shift_demands = [
        ShiftDemand(
            day_index=d.dayIndex,
            shift_id=d.shiftId,
            quantity=d.quantity,
            start_time=d.startTime.time(),
            duration=d.duration,
        )
        for d in req.shiftDemands
    ]

    cov = coverage_db.create_coverage(
        name=req.name,
        shift_demands=shift_demands,
    )

    response = coverage_to_api_msg(cov)
    return response


@router.put("/coverages/{coverage_id}")
def update_coverage(coverage_id: str, updated_coverage: CoverageMessage):
    cov_data = api_msg_to_coverage(updated_coverage)

    existing_cov = coverage_db.get_coverage_by_id(coverage_id)
    if not existing_cov:
        raise HTTPException(status_code=404, detail="Coverage does not exist")

    cov = coverage_db.update_coverage(cov_data)

    response = coverage_to_api_msg(cov)
    return response


@router.delete("/coverages/{coverage_id}")
def delete_coverage(coverage_id: str):
    coverage_db.delete_coverage(coverage_id)
    return {"message": "Coverage deleted successfully"}


def shift_demand_to_api_msg(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    data = asdict(shift_demand)
    data["start_time"] = datetime.combine(datetime.now().date(), data["start_time"])
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    return validator.validate_python(as_dict)


def coverage_to_api_msg(coverage: Coverage) -> CoverageMessage:
    data = asdict(coverage)
    data["shift_demands"] = [shift_demand_to_api_msg(d) for d in coverage.shift_demands]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageMessage)
    return validator.validate_python(as_dict)


def api_msg_to_coverage(msg: CoverageMessage) -> Coverage:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["shift_demands"] = [
        ShiftDemand(**humps.decamelize(d)) for d in data_snake["shift_demands"]
    ]
    return Coverage(**data_snake)
