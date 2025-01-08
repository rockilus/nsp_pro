from celery import Celery  # type: ignore

from config import config

# Create Celery app
celery_app = Celery(
    "data_fetcher",
    broker=config.redis_url,
    backend=config.result_backend,
    task_routes={
        "processing_engine.solve_problem": {"queue": "processing_queue"},
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
    broker_connection_max_retries=None,  # Retry indefinitely
    broker_connection_retry_on_startup=True,
    broker_connection_retry_interval_start=0.2,  # Initial retry delay (seconds)
    broker_connection_retry_interval_max=10.0,  # Maximum retry delay (seconds)
    broker_connection_retry_interval_step=0.2,  # Incremental backoff factor
    worker_cancel_long_running_tasks_on_connection_loss=True,
)
