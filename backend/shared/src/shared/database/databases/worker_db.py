from datetime import datetime, time, timezone
from typing import List

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.team import Specialty as SpecialtyDocument
from shared.database.models.team import Team as TeamDocument
from shared.database.models.worker import Worker as WorkerDocument
from shared.logger.logger import log_info
from shared.schemas.errors.schema_error_handlers import (
    handle_create_schema_object_error,
)
from shared.schemas.schemas.worker import Worker


class WorkerDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker(self, worker: Worker) -> Worker:
        worker_doc = core_to_doc_worker(worker)
        worker_doc.id = str(ObjectId())
        try:
            worker_saved = worker_doc.save()
        except Exception as e:
            log_info("Failed to save worker to database")
            handle_save_document_error(e)
        return doc_to_core_worker(worker_saved)

    def create_workers(self, workers: List[Worker]) -> List[Worker]:
        try:
            w_docs = core_to_doc_workers(workers, creating=True)
        except Exception as e:
            log_info("Failed to convert Workers to WorkerDocuments")
            handle_create_document_error(e)
        try:
            # pylint: disable=no-member
            w_saved = WorkerDocument.objects.insert(w_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save workers to database")
            handle_save_document_error(e)
        return [doc_to_core_worker(w) for w in w_saved]

    def get_workers(self, team_id: str) -> List[Worker]:
        try:
            # pylint: disable=no-member
            workers = WorkerDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get workers from database")
            handle_get_document_error(e)
        return [doc_to_core_worker(w) for w in list(workers)]

    def get_workers_not_deleted(self, team_id: str) -> List[Worker]:
        try:
            # pylint: disable=no-member
            workers = WorkerDocument.objects.filter(  # type: ignore
                team=team_id, deleted=False
            )
        except Exception as e:
            log_info("Failed to get workers from database")
            handle_get_document_error(e)
        return [doc_to_core_worker(w) for w in list(workers)]

    def get_worker_by_id(self, worker_id: str) -> Worker:
        try:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get worker by id from database")
            handle_get_document_error(e)
        return doc_to_core_worker(worker)

    def get_workers_by_specialty_id(self, specialty_id: str) -> List[Worker]:
        try:
            # pylint: disable=no-member
            w_docs = WorkerDocument.objects.filter(  # type: ignore
                specialties__contains=specialty_id
            )
        except Exception as e:
            log_info("Failed to get workers by specialty id from database")
            handle_get_document_error(e)
        return [doc_to_core_worker(a) for a in w_docs]

    def update_worker(self, worker: Worker) -> Worker:
        worker_doc = core_to_doc_worker(worker)
        try:
            # pylint: disable=no-member
            WorkerDocument.objects.get(id=worker.id)  # type: ignore
        except Exception as e:
            log_info(f"Worker with id {worker_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            worker_saved = worker_doc.save()
        except Exception as e:
            log_info("Failed to update worker to database")
            handle_save_document_error(e)
        return doc_to_core_worker(worker_saved)

    def update_workers(self, workers: List[Worker]) -> List[Worker]:
        try:
            w_docs = core_to_doc_workers(workers)
        except Exception as e:
            log_info("Failed to convert Workers to WorkerDocuments")
            handle_create_document_error(e)
        try:
            for w_doc in w_docs:
                w_doc.save()
        except Exception as e:
            log_info("Failed to update workers")
            handle_save_document_error(e)
        return [doc_to_core_worker(w) for w in w_docs]

    def delete_worker(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get worker by id to delete from database")
            handle_get_document_error(e)
        try:
            worker.delete()
        except Exception as e:
            log_info("Failed to delete worker from database")
            handle_delete_document_error(e)

    def logical_delete_worker(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(id=worker_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get worker by id to delete from database")
            handle_get_document_error(e)
            return  # Exit the method if the worker is not found

        try:
            worker.update(set__deleted=True)
        except Exception as e:
            log_info("Failed to set deleted field to true for worker in database")
            handle_save_document_error(e)


# Mappers
# core to document
def core_to_doc_worker(dataclass_obj: Worker) -> WorkerDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
        specialties = SpecialtyDocument.objects.filter(  # type: ignore
            id__in=dataclass_obj.specialty_ids
        )
    except Exception as e:
        log_info("Failed to get team by id to create worker")
        handle_get_document_error(e)
    try:
        w_doc = WorkerDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            acronym=dataclass_obj.acronym,
            acronym_custom=dataclass_obj.acronym_custom,
            employment_start_date=datetime.combine(
                dataclass_obj.employment_start_date, time.min, timezone.utc
            ).timestamp(),
            employment_end_date=(
                datetime.combine(
                    dataclass_obj.employment_end_date, time.min, timezone.utc
                ).timestamp()
                if dataclass_obj.employment_end_date
                else None
            ),
            weekly_hours=dataclass_obj.weekly_hours,
            weekly_hours_desired=dataclass_obj.weekly_hours_desired,
            duties_per_month=dataclass_obj.duties_per_month,
            annual_leave=dataclass_obj.annual_leave,
            specialties=specialties,
            deleted=dataclass_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert Worker to WorkerDocument")
        handle_create_document_error(e)
    return w_doc


def core_to_doc_workers(
    dataclass_objs: List[Worker], creating: bool = False
) -> List[WorkerDocument]:
    team_ids = list(set(doc.team_id for doc in dataclass_objs))
    # pylint: disable=no-member
    teams = {
        team.id: team
        for team in TeamDocument.objects.filter(id__in=team_ids)  # type: ignore
    }
    specialty_ids = list(set(doc.specialty_ids for doc in dataclass_objs))
    # pylint: disable=no-member
    specialties = {
        specialty.id: specialty
        for specialty in SpecialtyDocument.objects.filter(  # type: ignore
            id__in=specialty_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        w_doc = WorkerDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            team=teams.get(dataclass_obj.team_id),
            name=dataclass_obj.name,
            employment_start_date=datetime.combine(
                dataclass_obj.employment_start_date, time.min, timezone.utc
            ).timestamp(),
            employment_end_date=(
                datetime.combine(
                    dataclass_obj.employment_end_date, time.min, timezone.utc
                ).timestamp()
                if dataclass_obj.employment_end_date
                else None
            ),
            weekly_hours=dataclass_obj.weekly_hours,
            weekly_hours_desired=dataclass_obj.weekly_hours_desired,
            duties_per_month=dataclass_obj.duties_per_month,
            annual_leave=dataclass_obj.annual_leave,
            specialties=[specialties.get(s) for s in dataclass_obj.specialty_ids],
            deleted=dataclass_obj.deleted,
        )
        out.append(w_doc)
    return out


# document to core
def doc_to_core_worker(doc_obj: WorkerDocument) -> Worker:
    try:
        worker = Worker(
            id=doc_obj.id,
            team_id=str(doc_obj.team.id),
            name=str(doc_obj.name) if doc_obj.name is not None else "",
            acronym=(str(doc_obj.acronym) if doc_obj.acronym is not None else ""),
            acronym_custom=doc_obj.acronym_custom,
            employment_start_date=datetime.fromtimestamp(
                doc_obj.employment_start_date, timezone.utc
            ).date(),
            employment_end_date=(
                datetime.fromtimestamp(doc_obj.employment_end_date, timezone.utc).date()
                if doc_obj.employment_end_date
                else None
            ),
            weekly_hours=doc_obj.weekly_hours,
            weekly_hours_desired=doc_obj.weekly_hours_desired,
            duties_per_month=doc_obj.duties_per_month,
            annual_leave=doc_obj.annual_leave,
            specialty_ids=[s.id for s in doc_obj.specialties],
            deleted=doc_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert WorkerDocument to Worker")
        handle_create_schema_object_error(e)
    return worker
