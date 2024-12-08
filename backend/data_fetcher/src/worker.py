# pylint: disable=unused-import
from tasks.fetcher import get_engine_inputs_task  # noqa: F401

if __name__ == "__main__":
    from app import celery_app

    celery_app.worker_main(
        argv=[
            "-A",
            "app",
            "worker",
            "--loglevel=info",
            "--queues=fetcher_queue",
            "--hostname=fetcher_worker@%h",
        ]
    )
