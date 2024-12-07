# pylint: disable=unused-import
from tasks.saver import save_engine_outputs_task  # noqa: F401

if __name__ == "__main__":
    from app import celery_app

    celery_app.worker_main(
        argv=[
            "-A",
            "app",
            "worker",
            "--loglevel=info",
            "--queues=storage_queue",
        ]
    )
