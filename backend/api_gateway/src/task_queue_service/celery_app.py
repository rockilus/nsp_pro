from celery import Celery  # type: ignore

# celery_app = Celery(
#     "api_gateway",
#     broker="redis://localhost:6379/0",
#     backend="redis://localhost:6379/0",
# )

# celery_app.conf.update(
#     result_expires=3600,
# )


def create_celery_app() -> Celery:
    """
    Create and configure a Celery application.
    Returns:
        Celery: The configured Celery instance.
    """
    app = Celery(
        broker="redis://localhost:6379/0",
        backend="redis://localhost:6379/1",
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
