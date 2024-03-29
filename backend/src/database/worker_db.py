from typing import List

from bson import ObjectId

from core.worker import Worker
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Team as TeamDocument
from models import Worker as WorkerDocument


class WorkerDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker(self, worker: Worker) -> Worker:
        worker_doc = core_to_doc_worker(worker)
        worker_doc.id = str(ObjectId())
        try:
            worker_saved = worker_doc.save()
        except Exception as e:
            log_info(f"Failed to save worker to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_worker(worker_saved)

    def get_workers(self, team_id: str) -> List[Worker]:
        try:
            # pylint: disable=no-member
            workers = WorkerDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get workers from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_worker(w) for w in list(workers)]

    def get_worker_by_id(self, worker_id: str) -> Worker:
        try:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get worker by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_worker(worker)

    def update_worker(self, worker: Worker) -> Worker:
        worker_doc = core_to_doc_worker(worker)
        try:
            worker_saved = worker_doc.save()
        except Exception as e:
            log_info(f"Failed to update worker to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_worker(worker_saved)

    def delete_worker(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        except Exception as e:
            log_info(
                f"Failed to get worker by id to delete from database: {e}"
            )
            handle_get_document_error(e)
        try:
            worker.delete()
        except Exception as e:
            log_info(f"Failed to delete worker from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_worker(dataclass_obj: Worker) -> WorkerDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get team by id to create worker: {e}")
        handle_get_document_error(e)
    try:
        w_doc = WorkerDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
        )
    except Exception as e:
        log_info(f"Failed to convert Worker to WorkerDocument: {e}")
        handle_create_document_error(e)
    return w_doc


# document to core
def doc_to_core_worker(doc_obj: WorkerDocument) -> Worker:
    try:
        worker = Worker(
            id=doc_obj.id,
            team_id=str(doc_obj.team.id),
            name=str(doc_obj.name) if doc_obj.name is not None else "",
        )
    except Exception as e:
        log_info(f"Failed to convert WorkerDocument to Worker: {e}")
        handle_create_core_object_error(e)
    return worker
