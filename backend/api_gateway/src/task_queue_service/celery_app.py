from celery import Celery  # type: ignore


def create_celery_app() -> Celery:
    app = Celery(
        broker="redis://localhost:6379/0",
        # backend="redis://localhost:6379/1",
        backend="redis://localhost:6379/0",
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
