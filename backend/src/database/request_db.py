from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.request import Request
from core.worker import Worker
from database.db import DB
from database.worker_db import to_mongo_worker
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.request import Request as RequestDocument


class RequestDB:
    def __init__(self, db: DB):
        self.db = db

    def create_request(self, request: Request) -> Request:
        r_data = to_mongo_request(request)
        r_doc = RequestDocument(
            id=str(ObjectId()),
            worker=r_data.worker,
            date=r_data.date,
            shift=r_data.shift,
            priority=r_data.priority,
            status="pending",
        )
        r_saved = r_doc.save()
        return _from_mongo_request(r_saved)

    def get_requests(self, workers: List[Worker]) -> List[Request]:
        w_docs = [to_mongo_worker(w) for w in workers]
        # pylint: disable=no-member
        requests = RequestDocument.objects.filter(worker__in=w_docs)  # type: ignore
        return [_from_mongo_request(r) for r in list(requests)]

    def get_request_by_id(self, request_id: str) -> Request:
        # pylint: disable=no-member
        request = RequestDocument.objects.get(id=request_id)  # type: ignore
        return _from_mongo_request(request)

    def get_requests_by_dates(
        self, start_date: date, end_date: date, workers: List[Worker]
    ) -> List[Request]:
        w_docs = [to_mongo_worker(w) for w in workers]
        # pylint: disable=no-member
        requests = RequestDocument.objects.filter(  # type: ignore
            date__gte=start_date, date__lte=end_date, worker__in=w_docs
        )
        return [_from_mongo_request(r) for r in list(requests)]

    def update_request(self, request: Request) -> Request:
        r_doc = to_mongo_request(request)
        r_saved = r_doc.save()
        return _from_mongo_request(r_saved)

    def delete_request(self, request_id: str) -> None:
        # pylint: disable=no-member
        request = RequestDocument.objects.get(id=request_id)  # type: ignore
        request.delete()

    def delete_requests_by_worker_id(self, worker_id: str) -> None:
        # pylint: disable=no-member
        requests = RequestDocument.objects(  # type: ignore
            worker=worker_id  # type: ignore
        )
        for r in requests:
            r.delete()


# Mappers
def to_mongo_request(
    dataclass_obj: Request,
) -> RequestDocument:
    # pylint: disable=no-member
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    return RequestDocument(
        id=dataclass_obj.id,
        worker=worker,
        date=dataclass_obj.date,
        shift=shift,
        priority=dataclass_obj.priority,
        status=dataclass_obj.status,
    )


def _from_mongo_request(
    doc_obj: RequestDocument,
) -> Request:
    date_datetime = datetime.combine(doc_obj.date, datetime.min.time()).date()
    return Request(
        id=doc_obj.id,
        worker_id=doc_obj.worker.id,
        date=date_datetime,
        shift_id=doc_obj.shift.id,
        priority=doc_obj.priority,
        status=doc_obj.status,
    )
