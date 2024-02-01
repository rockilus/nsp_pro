from dataclasses import asdict
from datetime import datetime
from typing import Dict, List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.coverage import CoverageSelector
from routes.api_model import CoverageSelectorMessage
from scripts.setup_database import coverage_selector_db

router = APIRouter()


@router.post("/coverage-selectors")
def create_coverage_selector(
    coverage_selector: CoverageSelectorMessage,
) -> CoverageSelectorMessage:
    coverage_selector_data = api_msg_to_coverage_selector(coverage_selector)
    coverage_selector_created = coverage_selector_db.create_coverage_selector(
        coverage_selector_data.start_date,
        coverage_selector_data.end_date,
    )
    return coverage_selector_to_api_msg(coverage_selector_created)


@router.get("/coverage-selectors")
def get_coverage_selectors() -> List[CoverageSelectorMessage]:
    coverage_selectors = coverage_selector_db.get_coverage_selectors()
    return [coverage_selector_to_api_msg(w) for w in coverage_selectors]


@router.put("/coverage-selectors/{coverage_selector_id}")
def update_coverage_selector(
    coverage_selector_id: str, coverage_selector_api: CoverageSelectorMessage
) -> CoverageSelectorMessage:
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


@router.delete("/coverage-selectors/{coverage_selector_id}")
def delete_coverage_selector(coverage_selector_id: str) -> Dict:
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
