# pylint: disable=unused-import
import multiprocessing

from uvicorn import Config, Server

from config import config
from db_operations import get_collections
from tasks.saver import save_engine_outputs_task  # noqa: F401


def start_fastapi_server():
    uvicorn_config = Config(
        "health:app",
        host=config.api_domain,
        port=config.api_port,
        reload=config.uvicorn_reload,
        log_level="info",
    )
    server = Server(uvicorn_config)
    server.run()


if __name__ == "__main__":
    from app import celery_app

    # Start the FastAPI server in a separate process
    fastapi_process = multiprocessing.Process(target=start_fastapi_server)
    fastapi_process.start()

    # Initialize the database connection in the Celery worker process
    collections = get_collections()

    # Start the Celery worker
    celery_app.worker_main(
        argv=[
            "-A",
            "app",
            "worker",
            "--loglevel=info",
            "--queues=storage_queue",
            "--hostname=storage_worker@%h",
        ]
    )

    # Ensure the FastAPI server process is terminated when the worker exits
    fastapi_process.join()
