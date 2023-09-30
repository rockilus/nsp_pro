from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.coverage import Coverage, ShiftDemand
from routes.api_model import CoverageMessage, CreateCoverageRequest
from scripts.setup_database import coverage_db

router = APIRouter()


@router.get("/coverages")
def get_coverages() -> List[CoverageMessage]:
    coverages = coverage_db.get_coverages()
    return [coverage_to_api_msg(c) for c in coverages]


@router.post("/coverages", status_code=201)
def create_coverage(req: CreateCoverageRequest) -> CoverageMessage:
    shift_demands = [
        ShiftDemand(day_index=d.dayIndex, shift_id=d.shiftId, quantity=d.quantity)
        for d in req.shiftDemands
    ]

    cov = coverage_db.create_coverage(
        name=req.name,
        date_start=req.dateStart,
        date_end=req.dateEnd,
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


def coverage_to_api_msg(coverage: Coverage) -> CoverageMessage:
    data = asdict(coverage)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CoverageMessage)
    return validator.validate_python(as_dict)


def api_msg_to_coverage(msg: CoverageMessage) -> Coverage:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["shift_demands"] = [
        ShiftDemand(**humps.decamelize(d)) for d in data_snake["shift_demands"]
    ]
    return Coverage(**data_snake)
