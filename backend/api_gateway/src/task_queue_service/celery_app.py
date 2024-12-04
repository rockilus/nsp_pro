from celery import Celery  # type: ignore

app = Celery(
    "api_gateway",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
)

app.conf.update(
    result_expires=3600,
)
