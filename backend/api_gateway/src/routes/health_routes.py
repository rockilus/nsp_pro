from typing import Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections

from src.config import config
from src.dependencies import get_db_collections
from src.errors import AuthnConnectionError, AuthzConnectionError
from src.integrations.authentication import authn_health_check
from src.integrations.authorization import authz_connect, authz_health_check

router = APIRouter()


class ServiceStatus(BaseModel):
    status: str
    details: str | None


class HealthCheck(BaseModel):
    status: str
    services: Dict[str, ServiceStatus]


@router.get("/health", response_model=HealthCheck)
async def health_check(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> HealthCheck:
    health_status = {
        "database": ServiceStatus(status="ok", details=None),
        "authn": ServiceStatus(status="ok", details=None),
        "authz": ServiceStatus(status="ok", details=None),
    }
    try:
        db_collections.db.check_health()
    except Exception as e:
        health_status["database"].status = "error"
        health_status["database"].details = str(e)

    try:
        await authn_health_check()
    except AuthnConnectionError as e:
        health_status["authn"].status = "error"
        health_status["authn"].details = str(e)

    try:
        await authz_health_check()
    except AuthzConnectionError as e:
        health_status["authz"].status = "error"
        health_status["authz"].details = str(e)

    overall_status = (
        "ok"
        if all(service.status == "ok" for service in health_status.values())
        else "error"
    )
    if overall_status == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            # detail=health_status,
            detail={
                key: value.model_dump() for key, value in health_status.items()
            },
        )
    return HealthCheck(status=overall_status, services=health_status)


@router.get("/check-authn-health")
async def check_authz_health(
    request: Request,
    # pdp_url: str = Query(..., description="The URL of the Permit PDP")
):
    try:
        print(f"Full incoming request URL: {request.url}")
        print(f"Raw query parameters from request object: {request.url.query}")
        print(
            f"Parsed query parameters from request object: {request.query_params}"
        )
        pdp_url = request.query_params.get("pdp_url", None)
        if not pdp_url:
            raise HTTPException(
                status_code=400,
                detail="Missing required query parameter: pdp_url",
            )
        print("Tenants request with pdp url: ", pdp_url)
        permit = authz_connect(pdp_url, config.pdp_api_key)
        resource_instance = "team: 667d626f02d5723648a0f1fc"
        out = await permit.check(
            user="bb2a8dd2-240d-41fc-9920-9eb51948cb22",
            action="create-schedule",
            resource=resource_instance,
        )
        return {"status": "success", "users": out}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e


@router.get("/check-processing-engine-health")
async def check_processing_engine_health(
    processing_engine_url: str = Query(
        ..., description="The URL of the processing-engine service"
    )
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
