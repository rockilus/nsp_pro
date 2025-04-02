import httpx
import redis
from fastapi import APIRouter, HTTPException, Query, Request, status

from src.errors import AuthnConnectionError, AuthzConnectionError
from src.integrations.authentication import authn_health_check
from src.integrations.authorization import authz_connect, authz_health_check
from src.routes.api_model import HealthCheck, ServiceStatus
from src.utils.env_config import PDP_API_KEY

router = APIRouter()


@router.get("/health", response_model=HealthCheck)
async def health_check(request: Request) -> HealthCheck:
    health_status = {
        "database": ServiceStatus(status="ok", details=None),
        "authn": ServiceStatus(status="ok", details=None),
        "authz": ServiceStatus(status="ok", details=None),
    }
    db_collections = request.app.state.db_collections
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
            detail={key: value.model_dump() for key, value in health_status.items()},
        )
    return HealthCheck(status=overall_status, services=health_status)


@router.get("/check-authn-health")
async def check_authz_health(
    pdp_url: str = Query(..., description="The URL of the Permit PDP")
):
    try:
        print("Tenants request with pdp url: ", pdp_url)
        permit = authz_connect(pdp_url, PDP_API_KEY)
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


@router.get("/check-redis-health")
async def check_redis_health(
    redis_url: str = Query(..., description="The URL of the Redis server")
):
    try:
        client = redis.StrictRedis.from_url(redis_url)
        response = client.ping()
        if response is not True:
            raise HTTPException(
                status_code=503,
                detail="Redis health check failed: PING command did not return PONG",
            )
        return {"status": "success"}
    except redis.ConnectionError as e:
        raise HTTPException(
            status_code=503, detail=f"Redis health check failed: {str(e)}"
        ) from e


@router.get("/check-data-fetcher-health")
async def check_data_fetcher_health(
    data_fetcher_url: str = Query(
        ..., description="The URL of the data-fetcher service"
    )
):
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(f"{data_fetcher_url}/health")
            response.raise_for_status()
            return {
                "status": "success",
                "data_fetcher_status": response.json(),
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Data Fetcher health check failed: {e.response.text}",
        ) from e
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


@router.get("/check-storage-service-health")
async def check_storage_service_health(
    storage_service_url: str = Query(
        ..., description="The URL of the storage-service service"
    )
):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{storage_service_url}/health")
            response.raise_for_status()
            return {
                "status": "success",
                "storage_service_status": response.json(),
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Storage Service health check failed: {e.response.text}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e
