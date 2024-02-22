from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.request import Request
from core.shift import Shift
from core.worker import Worker
from database.db import DB
from database.shift_db import to_mongo_shift
from database.worker_db import to_mongo_worker
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument
from models.request import Request as RequestDocument


class RequestDB:
    def __init__(self, db: DB):
        self.db = db

    def create_request(
        self,
        worker: Worker,
        target_date: date,
        shift: Shift,
        priority: str,
    ) -> Request:
        request = RequestDocument(
            id=str(ObjectId()),
            worker=to_mongo_worker(worker),
            date=target_date,
            shift=to_mongo_shift(shift),
            priority=priority,
            status="pending",
        )
        request_saved = request.save()
        return _from_mongo_request(request_saved)

    def get_requests(self) -> List[Request]:
        # pylint: disable=no-member
        requests = RequestDocument.objects.all()  # type: ignore
        return [_from_mongo_request(fa) for fa in list(requests)]

    def get_request_by_id(self, request_id: str) -> Request:
        # pylint: disable=no-member
        request = RequestDocument.objects.get(id=request_id)  # type: ignore
        return _from_mongo_request(request)

    def get_requests_by_dates(self, start_date: date, end_date: date) -> List[Request]:
        # pylint: disable=no-member
        requests = RequestDocument.objects.filter(  # type: ignore
            date__gte=start_date, date__lte=end_date
        )
        return [_from_mongo_request(r) for r in list(requests)]

    def update_request(self, request: Request) -> Request:
        document = to_mongo_request(request)
        document_saved = document.save()
        return _from_mongo_request(document_saved)

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
