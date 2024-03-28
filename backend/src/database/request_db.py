from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.request import Request
from core.worker import Worker
from database.db import DB
from database.worker_db import core_to_doc_worker
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.request import Request as RequestDocument
from services.logging import log_info


class RequestDB:
    def __init__(self, db: DB):
        self.db = db

    def create_request(self, request: Request) -> Request:
        r_doc = core_to_doc_request(request)
        r_doc.id = str(ObjectId())
        r_doc.status = "pending"
        try:
            r_saved = r_doc.save()
        except Exception as e:
            log_info(f"Failed to save request to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_request(r_saved)

    def get_requests(self, workers: List[Worker]) -> List[Request]:
        w_docs = [core_to_doc_worker(w) for w in workers]
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects.filter(worker__in=w_docs)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get requests by workers from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_request(r) for r in list(requests)]

    def get_request_by_id(self, request_id: str) -> Request:
        # pylint: disable=no-member
        request = RequestDocument.objects.get(id=request_id)  # type: ignore
        return doc_to_core_request(request)

    def get_requests_by_dates(
        self, start_date: date, end_date: date, workers: List[Worker]
    ) -> List[Request]:
        w_docs = [core_to_doc_worker(w) for w in workers]
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects.filter(  # type: ignore
                date__gte=start_date, date__lte=end_date, worker__in=w_docs
            )
        except Exception as e:
            log_info(f"Failed to get requests by dates from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_request(r) for r in list(requests)]

    def update_request(self, request: Request) -> Request:
        r_doc = core_to_doc_request(request)
        try:
            r_saved = r_doc.save()
        except Exception as e:
            log_info(f"Failed to update request to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_request(r_saved)

    def delete_request(self, request_id: str) -> None:
        try:
            # pylint: disable=no-member
            request = RequestDocument.objects.get(id=request_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get request by id to delete from database: {e}")
            handle_get_document_error(e)
        try:
            request.delete()
        except Exception as e:
            log_info(f"Failed to delete request from database: {e}")
            handle_delete_document_error(e)

    def delete_requests_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects(  # type: ignore
                worker=worker_id  # type: ignore
            )
        except Exception as e:
            log_info(
                f"Failed to get requests by worker id to delete from database: {e}"
            )
            handle_get_document_error(e)
        try:
            for r in requests:
                r.delete()
        except Exception as e:
            log_info(f"Failed to delete requests from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_request(dataclass_obj: Request) -> RequestDocument:
    try:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get worker by id from database: {e}")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get shift by id from database: {e}")
        handle_get_document_error(e)
    try:
        r_doc = RequestDocument(
            id=dataclass_obj.id,
            worker=worker,
            date=dataclass_obj.date,
            shift=shift,
            priority=dataclass_obj.priority,
            status=dataclass_obj.status,
        )
    except Exception as e:
        log_info(f"Failed to convert Request to RequestDocument: {e}")
        handle_create_document_error(e)
    return r_doc


# document to core
def doc_to_core_request(doc_obj: RequestDocument) -> Request:
    date_datetime = datetime.combine(doc_obj.date, datetime.min.time()).date()
    try:
        request = Request(
            id=doc_obj.id,
            worker_id=doc_obj.worker.id,
            date=date_datetime,
            shift_id=doc_obj.shift.id,
            priority=doc_obj.priority,
            status=doc_obj.status,
        )
    except Exception as e:
        log_info(f"Failed to convert RequestDocument to Request: {e}")
        handle_create_core_object_error(e)
    return request
