# pylint: disable=unused-import
from tasks.solver import solve_problem  # noqa: F401


if __name__ == "__main__":
    from app import celery_app

    celery_app.worker_main(
        argv=[
            "-A",
            "app",
            "worker",
            "--loglevel=info",
            "--queues=processing_queue",
        ]
    )
