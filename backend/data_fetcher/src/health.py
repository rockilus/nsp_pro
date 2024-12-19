import redis
from fastapi import FastAPI, HTTPException

from app import celery_app
from config import config
from db_operations import db

app = FastAPI()


@app.get("/health")
async def health_check():
    try:
        # Check Redis connection
        redis_client = redis.StrictRedis.from_url(config.redis_url)
        if not redis_client.ping():
            raise HTTPException(status_code=503, detail="Redis health check failed")

        # Check Celery worker status
        inspector = celery_app.control.inspect()
        active_workers = inspector.active()
        if not active_workers:
            raise HTTPException(
                status_code=503, detail="No active Celery workers found"
            )

        # Check database connection
        db.check_mongo_health()
        return {"status": "ok"}
    except redis.ConnectionError as e:
        raise HTTPException(
            status_code=503, detail=f"Redis health check failed: {str(e)}"
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {str(e)}"
        ) from e
