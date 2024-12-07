from celery import Celery  # type: ignore

from config import config

# Create Celery app
celery_app = Celery(
    "processing_engine",
    broker=config.redis_url,
    backend=config.result_backend,
    # include=["tasks.solver"],
    task_routes={
        "processing_engine.solve_problem": {"queue": "processing_queue"},
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
    broker_connection_retry_on_startup=True,
)
# i = celery_app.control.inspect()
# celery_app.control.add_consumer("processing_queue", reply=True)
