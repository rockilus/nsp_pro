from celery import Celery  # type: ignore

from utils.env_config import REDIS_URL, RESULT_BACKEND


def create_celery_app() -> Celery:
    app = Celery(
        broker=REDIS_URL,
        backend=RESULT_BACKEND,
        task_routes={
            "data_fetcher.get_engine_inputs": {"queue": "fetcher_queue"},
            'processing_engine.solve_problem': {'queue': 'processing_queue'},
            'storage_service.save_engine_outputs': {'queue': 'storage_queue'},
        },
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
    return app


# Initialize the Celery app
celery_app = create_celery_app()
