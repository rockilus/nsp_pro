from celery import Celery

app = Celery(
    "processing_engine",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
)

app.conf.update(
    result_expires=3600,
)
