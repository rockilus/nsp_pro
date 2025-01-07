import time
from typing import Dict

import redis
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from shared.database.errors import DBConnectionError

from app import celery_app
from config import config
from db_operations import get_collections

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
        "database": ServiceStatus(status="ok", details=None),
    }

    try:
        redis_client = redis.StrictRedis.from_url(config.redis_url)
        max_retries = 5
        retry_delay = 2
        for attempt in range(max_retries):
            try:
                if redis_client.ping():
                    break
            except redis.ConnectionError as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                health_status["redis"].status = "error"
                health_status["redis"].details = str(e)
            except Exception as e:
                health_status["redis"].status = "error"
                health_status["redis"].details = str(e)
                break

        try:
            inspector = celery_app.control.inspect()
            active_workers = inspector.active()
            if not active_workers:
                # pylint: disable=broad-exception-raised
                raise Exception("No active workers found in Celery")
        except Exception as e:
            health_status["celery"].status = "error"
            health_status["celery"].details = str(e)

        try:
            collections = get_collections()
            collections.db.check_mongo_health()
        except DBConnectionError as e:
            health_status["database"].status = "error"
            health_status["database"].details = str(e)

        overall_status = (
            "ok"
            if all(service.status == "ok" for service in health_status.values())
            else "error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e
    if overall_status == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={key: value.model_dump() for key, value in health_status.items()},
        )
    return HealthCheck(status=overall_status, services=health_status)
