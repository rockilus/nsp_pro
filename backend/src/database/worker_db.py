from typing import List

from bson import ObjectId

from core.worker import Worker
from database.db import DB
from models import Team as TeamDocument
from models import Worker as WorkerDocument


class WorkerDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker(self, worker: Worker) -> Worker:
        worker_data = to_mongo_worker(worker)
        worker_doc = WorkerDocument(
            id=str(ObjectId()),
            team=worker_data.team,
            name=worker_data.name,
        )
        worker_saved = worker_doc.save()
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

    def update_worker(self, worker: Worker) -> Worker:
        worker_doc = to_mongo_worker(worker)
        worker_saved = worker_doc.save()
        return _from_mongo_worker(worker_saved)

    def delete_worker(self, worker_id: str) -> None:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        worker.delete()


# Mappers
def to_mongo_worker(dataclass_obj: Worker) -> WorkerDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return WorkerDocument(
        id=dataclass_obj.id,
        team=team,
        name=dataclass_obj.name,
    )


def _from_mongo_worker(doc_obj: WorkerDocument) -> Worker:
    return Worker(
        id=doc_obj.id,
        team_id=str(doc_obj.team.id),
        name=str(doc_obj.name) if doc_obj.name is not None else "",
    )
