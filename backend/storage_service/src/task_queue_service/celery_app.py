from celery import Celery  # type: ignore

app = Celery(
    "storage_service",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
)

app.conf.update(
    result_expires=3600,
)
