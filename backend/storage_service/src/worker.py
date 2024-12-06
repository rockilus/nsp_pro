from app import celery_app

# pylint: disable=unused-import
from tasks.saver import save_engine_outputs_task  # noqa: F401

if __name__ == "__main__":
    argv = [
        "worker",
        "--loglevel=DEBUG",
    ]
    celery_app.worker_main(argv)
