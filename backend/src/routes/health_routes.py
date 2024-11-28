from fastapi import APIRouter, HTTPException, status

from errors import AuthnConnectionError, AuthzConnectionError, DBConnectionError
from integrations.authentication import authn_health_check
from integrations.authorization import authz_health_check
from routes.api_model import HealthCheck, ServiceStatus
from scripts.setup_database import db

router = APIRouter()


@router.get("/health", response_model=HealthCheck)
async def health_check() -> HealthCheck:
    health_status = {
        "database": ServiceStatus(status="ok", details=None),
        "authn": ServiceStatus(status="ok", details=None),
        "authz": ServiceStatus(status="ok", details=None),
    }

    try:
        db.check_mongo_health()
    except DBConnectionError as e:
        health_status["database"].status = "error"
        health_status["database"].details = str(e)

    try:
        authn_health_check()
    except AuthnConnectionError as e:
        health_status["authn"].status = "error"
        health_status["authn"].details = str(e)

    try:
        authz_health_check()
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
