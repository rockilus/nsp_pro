from celery import Celery  # type: ignore

from config import config

# Create Celery app
celery_app = Celery(
    "storage_service",
    broker=config.redis_url,
    backend=config.result_backend,
)

# Set Celery config
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)
