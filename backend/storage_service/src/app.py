from celery import Celery  # type: ignore

from config import config

# Create Celery app
celery_app = Celery(
    "storage_service",
    broker=config.redis_url,
    backend=config.result_backend,
    task_routes={
        "storage_service.save_engine_outputs": {"queue": "storage_queue"},
    },
)

# Set Celery config
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry=True,
    broker_connection_max_retries=None,
    broker_connection_retry_on_startup=True,
    broker_connection_retry_interval_start=0.2,
    broker_connection_retry_interval_max=10.0,
    broker_connection_retry_interval_step=0.2,
)
