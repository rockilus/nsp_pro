# pylint: disable=unused-import
from app import celery_app
from tasks.solve_campaign import solve_campaign_task  # noqa: F401

if __name__ == "__main__":
    celery_app.worker_main(
        argv=[
            "-A",
            "app",
            "worker",
            "--loglevel=info",
            "--queues=solve_queue",
            "--hostname=solve_worker@%h",
        ]
    )
