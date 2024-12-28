from typing import Dict

import redis
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

from app import celery_app
from config import config

app = FastAPI()


class ServiceStatus(BaseModel):
    status: str
    details: str | None


class HealthCheck(BaseModel):
    status: str
    services: Dict[str, ServiceStatus]


@app.get("/health")
async def health_check() -> HealthCheck:
    health_status = {
        "redis": ServiceStatus(status="ok", details=None),
        "celery": ServiceStatus(status="ok", details=None),
    }

    try:
        try:
            redis_client = redis.StrictRedis.from_url(config.redis_url)
            if not redis_client.ping():
                # pylint: disable=broad-exception-raised
                raise Exception("Failed to ping Redis")
        except redis.ConnectionError as e:
            health_status["redis"].status = "error"
            health_status["redis"].details = str(e)
        except Exception as e:
            health_status["redis"].status = "error"
            health_status["redis"].details = str(e)

        try:
            inspector = celery_app.control.inspect()
            active_workers = inspector.active()
            if not active_workers:
                # pylint: disable=broad-exception-raised
                raise Exception("No active workers found in Celery")
        except Exception as e:
            health_status["celery"].status = "error"
            health_status["celery"].details = str(e)

        overall_status = (
            "ok"
            if all(service.status == "ok" for service in health_status.values())
            else "error"
        )
        if overall_status == "error":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    key: value.model_dump() for key, value in health_status.items()
                },
            )
        return HealthCheck(status=overall_status, services=health_status)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e
