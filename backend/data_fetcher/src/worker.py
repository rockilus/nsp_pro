# pylint: disable=unused-import
import multiprocessing
from typing import List

from uvicorn import Config, Server

from app import celery_app
from config import config
from tasks.fetcher import get_engine_inputs_task  # noqa: F401


class ServiceProcesses:
    def __init__(self) -> None:
        self.processes: List[multiprocessing.Process] = []
        self.fastapi_process_name = "fastapi"
        self.celery_worker_process_name = "celery_worker"

    @staticmethod
    def start_fastapi_server() -> None:
        uvicorn_config = Config(
            "health:app",
            host=config.api_domain,
            port=config.api_port,
            reload=config.uvicorn_reload,
            log_level="info",
        )
        server = Server(uvicorn_config)
        server.run()

    @staticmethod
    def start_celery_worker() -> None:
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

    def start_processes(self) -> None:
        self.terminate_process(self.fastapi_process_name)
        fastapi_process = multiprocessing.Process(
            target=self.start_fastapi_server, name=self.fastapi_process_name
        )
        fastapi_process.start()
        self.processes.append(fastapi_process)

        self.terminate_process(self.celery_worker_process_name)
        celery_worker_process = multiprocessing.Process(
            target=self.start_celery_worker,
            name=self.celery_worker_process_name,
        )
        celery_worker_process.start()
        self.processes.append(celery_worker_process)

        fastapi_process.join()
        print("Processes started")

    def terminate_process(self, process_name) -> None:
        for process in self.processes:
            if process.name == process_name and process.is_alive():
                process.terminate()

        print(f"{process_name} processes terminated")


service_processes = ServiceProcesses()

if __name__ == "__main__":
    service_processes.start_processes()

    # from app import celery_app

    # # Start the FastAPI server in a separate process
    # fastapi_process = multiprocessing.Process(target=start_fastapi_server)
    # fastapi_process.start()

    # # Start the Celery worker
    # celery_app.worker_main(
    #     argv=[
    #         "-A",
    #         "app",
    #         "worker",
    #         "--loglevel=info",
    #         "--queues=fetcher_queue",
    #         "--hostname=fetcher_worker@%h",
    #     ]
    # )

    # # Ensure the FastAPI server process is terminated when the worker exits
    # fastapi_process.join()
