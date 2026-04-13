from typing import Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections

from src.config import config
from src.dependencies import get_db_collections
from src.integrations.authorization import cerbos_health_check

router = APIRouter()


class ServiceStatus(BaseModel):
    status: str
    details: str | None


class HealthCheck(BaseModel):
    status: str
    database_type: str
    environment: str
    services: Dict[str, ServiceStatus]


@router.get("/health", response_model=HealthCheck)
async def health_check(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> HealthCheck:
    health_status = {
        "database": ServiceStatus(status="ok", details=None),
        "authz": ServiceStatus(status="ok", details=None),
    }
    try:
        # Use the factory to check database health
        is_healthy = await db_collections.database_interface.health_check()
        if not is_healthy:
            health_status["database"].status = "error"
            health_status["database"].details = "Database health check failed"
    except Exception as e:
        health_status["database"].status = "error"
        health_status["database"].details = str(e)

    try:
        await cerbos_health_check()
    except Exception as e:
        health_status["authz"].status = "error"
        health_status["authz"].details = str(e)

    overall_status = (
        "ok"
        if all(service.status == "ok" for service in health_status.values())
        else "error"
    )

    db_type = "documentdb" if config.use_documentdb else "mongodb"

    if overall_status == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={key: value.model_dump() for key, value in health_status.items()},
        )
    return HealthCheck(
        status=overall_status,
        database_type=db_type,
        environment=config.environment,
        services=health_status,
    )


@router.get("/check-processing-engine-health")
async def check_processing_engine_health(
    processing_engine_url: str = Query(
        ..., description="The URL of the processing-engine service"
    ),
):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{processing_engine_url}/health")
            response.raise_for_status()
            return {
                "status": "success",
                "processing_engine_status": response.json(),
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Processing Engine health check failed: {e.response.text}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e
