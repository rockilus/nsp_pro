from datetime import date, datetime, time, timezone
from typing import List

from bson import ObjectId

from core import Request, RequestStatus, Worker
from database.db import DB
from database.worker_db import core_to_doc_worker
from errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Request as RequestDocument
from models import Shift as ShiftDocument
from models import Team as TeamDocument
from models import Worker as WorkerDocument


class RequestDB:
    def __init__(self, db: DB):
        self.db = db

    def create_request(self, request: Request) -> Request:
        r_doc = core_to_doc_request(request)
        r_doc.id = str(ObjectId())
        r_doc.status = RequestStatus.PENDING.value
        try:
            r_saved = r_doc.save()
        except Exception as e:
            log_info("Failed to save request to database")
            handle_save_document_error(e)
        return doc_to_core_request(r_saved)

    def get_requests(self, workers: List[Worker]) -> List[Request]:
        w_docs = [core_to_doc_worker(w) for w in workers]
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects.filter(worker__in=w_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to get requests by workers from database")
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
                start_date__gte=start_date,
                end_date__lte=end_date,
                worker__in=w_docs,
            )
        except Exception as e:
            log_info("Failed to get requests by dates from database")
            handle_get_document_error(e)
        return [doc_to_core_request(r) for r in list(requests)]

    def update_request(self, request: Request) -> Request:
        r_doc = core_to_doc_request(request)
        try:
            # pylint: disable=no-member
            RequestDocument.objects.get(id=r_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Request with id {r_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            r_saved = r_doc.save()
        except Exception as e:
            log_info("Failed to update request to database")
            handle_save_document_error(e)
        return doc_to_core_request(r_saved)

    def update_requests(self, requests: List[Request]) -> List[Request]:
        try:
            r_docs = core_to_doc_requests(requests)
        except Exception as e:
            log_info("Failed to convert Requests to RequestDocuments")
            handle_create_document_error(e)
        try:
            for r_doc in r_docs:
                r_doc.save()
        except Exception as e:
            log_info("Failed to update requests")
            handle_save_document_error(e)
        return [doc_to_core_request(r) for r in r_docs]

    def delete_request(self, request_id: str) -> None:
        try:
            # pylint: disable=no-member
            request = RequestDocument.objects.get(id=request_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get request by id to delete from database")
            handle_get_document_error(e)
        try:
            request.delete()
        except Exception as e:
            log_info("Failed to delete request from database")
            handle_delete_document_error(e)

    def delete_requests_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects(  # type: ignore
                worker=worker_id  # type: ignore
            )
        except Exception as e:
            log_info("Failed to get requests by worker id to delete from database")
            handle_get_document_error(e)
        try:
            for r in requests:
                r.delete()
        except Exception as e:
            log_info("Failed to delete requests from database")
            handle_delete_document_error(e)

    def delete_requests_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            requests = RequestDocument.objects(  # type: ignore
                shift=shift_id  # type: ignore
            )
        except Exception as e:
            log_info("Failed to get requests by shift id to delete from database")
            handle_get_document_error(e)
        try:
            for r in requests:
                r.delete()
        except Exception as e:
            log_info("Failed to delete requests from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_request(dataclass_obj: Request) -> RequestDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get team by id from database")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get worker by id from database")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id from database")
        handle_get_document_error(e)
    try:
        r_doc = RequestDocument(
            id=dataclass_obj.id,
            team=team,
            worker=worker,
            start_date=datetime.combine(
                dataclass_obj.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                dataclass_obj.end_date, time.min, timezone.utc
            ).timestamp(),
            shift=shift,
            negative=dataclass_obj.negative,
            hard=dataclass_obj.hard,
            status=dataclass_obj.status.value,
        )
    except Exception as e:
        log_info("Failed to convert Request to RequestDocument")
        handle_create_document_error(e)
    return r_doc


def core_to_doc_requests(
    dataclass_objs: List[Request], creating: bool = False
) -> List[RequestDocument]:
    team_ids = list(set(doc.team_id for doc in dataclass_objs))
    # pylint: disable=no-member
    teams = {
        team.id: team
        for team in TeamDocument.objects.filter(id__in=team_ids)  # type: ignore
    }
    # pylint: disable=R0801
    worker_ids = list(set(doc.worker_id for doc in dataclass_objs))
    # pylint: disable=no-member
    workers = {
        worker.id: worker
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
    }
    shift_ids = list(set(doc.shift_id for doc in dataclass_objs))
    shifts = {
        shift.id: shift
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    out = []
    for dataclass_obj in dataclass_objs:
        request_doc = RequestDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            team=teams.get(dataclass_obj.team_id),
            worker=workers.get(dataclass_obj.worker_id),
            start_date=datetime.combine(
                dataclass_obj.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                dataclass_obj.end_date, time.min, timezone.utc
            ).timestamp(),
            shift=shifts.get(dataclass_obj.shift_id),
            negative=dataclass_obj.negative,
            hard=dataclass_obj.hard,
            status=dataclass_obj.status.value,
        )
        out.append(request_doc)
    return out


# document to core
def doc_to_core_request(doc_obj: RequestDocument) -> Request:
    # pylint: disable=R0801
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["worker_id"] = doc_dict["worker"]
    doc_dict["start_date"] = datetime.fromtimestamp(
        doc_dict["start_date"], timezone.utc
    ).date()
    doc_dict["end_date"] = datetime.fromtimestamp(
        doc_dict["end_date"], timezone.utc
    ).date()
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict["status"] = RequestStatus(doc_dict["status"])
    doc_dict.pop("_id")
    doc_dict.pop("team")
    doc_dict.pop("worker")
    doc_dict.pop("shift")
    return Request(**doc_dict)
