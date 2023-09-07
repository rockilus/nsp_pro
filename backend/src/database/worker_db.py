from typing import List

from bson import ObjectId
from database.db import DB
from models import Worker


class WorkerDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker(
        self,
    ) -> Worker:
        worker = Worker(
            _id=ObjectId(),
        )
        worker_saved = worker.save()
        return worker_saved

    def get_workers(
        self,
    ) -> List[Worker]:
        # pylint: disable=no-member
        workers = Worker.objects.all()  # type: ignore
        return list(workers)

    def get_worker_by_id(self, worker_id: str) -> Worker:
        # pylint: disable=no-member
        print("worker_id in get_worker_by_id:", worker_id)
        worker = Worker.objects.get(_id=worker_id)  # type: ignore
        return worker

    def delete_worker(self, worker: Worker) -> None:
        worker.delete()
