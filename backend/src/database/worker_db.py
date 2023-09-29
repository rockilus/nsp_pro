from typing import List

from bson import ObjectId
from core.worker import Worker
from database.db import DB
from models import Worker as WorkerDocument


class WorkerDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker(
        self,
    ) -> Worker:
        worker = WorkerDocument(
            id=str(ObjectId()),
        )
        worker_saved = worker.save()
        return _from_mongo_worker(worker_saved)

    def get_workers(
        self,
    ) -> List[Worker]:
        # pylint: disable=no-member
        workers = WorkerDocument.objects.all()  # type: ignore
        return [_from_mongo_worker(w) for w in list(workers)]

    def get_worker_by_id(self, worker_id: str) -> Worker:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        return _from_mongo_worker(worker)

    def delete_worker(self, worker_id: str) -> None:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        worker.delete()


# Mappers
def to_mongo_worker(dataclass_obj: Worker) -> WorkerDocument:
    return WorkerDocument(
        id=dataclass_obj.id,
    )


def _from_mongo_worker(doc_obj: WorkerDocument) -> Worker:
    return Worker(
        id=doc_obj.id,
    )
