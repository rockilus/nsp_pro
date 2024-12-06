from app import celery_app

# pylint: disable=unused-import
from tasks.solver import solve_problem  # noqa: F401

if __name__ == "__main__":
    argv = [
        "worker",
        "--loglevel=DEBUG",
    ]
    celery_app.worker_main(argv)
