from typing import List

from bson import ObjectId

from core import Coverage
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Coverage as CoverageDocument
from models import Team as TeamDocument


class CoverageDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage(self, coverage: Coverage) -> Coverage:
        c_doc = core_to_doc_coverage(coverage)
        c_doc.id = str(ObjectId())
        try:
            c_saved = c_doc.save()
        except Exception as e:
            log_info("Failed to save coverage to database")
            handle_save_document_error(e)
        return doc_to_core_coverage(c_saved)

    def get_coverages(self, team_id: str) -> List[Coverage]:
        try:
            # pylint: disable=no-member
            coverages = CoverageDocument.objects(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get coverages from database")
            handle_get_document_error(e)
        return [doc_to_core_coverage(c) for c in list(coverages)]

    def get_coverage_by_id(self, coverage_id: str) -> Coverage:
        try:
            # pylint: disable=no-member
            coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get coverage from database")
            handle_get_document_error(e)
        return doc_to_core_coverage(coverage)

    def update_coverage(self, coverage: Coverage) -> Coverage:
        c_doc = core_to_doc_coverage(coverage)
        try:
            # pylint: disable=no-member
            CoverageDocument.objects.get(id=c_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Coverage with id {c_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            c_saved = c_doc.save()
        except Exception as e:
            log_info("Failed to update coverage in database")
            handle_save_document_error(e)
        return doc_to_core_coverage(c_saved)

    def delete_coverage(self, coverage_id: str) -> None:
        try:
            # pylint: disable=no-member
            coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get coverage by id to delete from database")
            handle_get_document_error(e)
        try:
            coverage.delete()
        except Exception as e:
            log_info("Failed to delete coverage from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_coverage(dataclass_obj: Coverage) -> CoverageDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get team from database")
        handle_get_document_error(e)
    try:
        c_doc = CoverageDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
        )
    except Exception as e:
        log_info("Failed to convert Coverage to CoverageDocument")
        handle_create_document_error(e)
    return c_doc


# document to core
def doc_to_core_coverage(doc_obj: CoverageDocument) -> Coverage:
    try:
        coverage = Coverage(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            name=doc_obj.name,
        )
    except Exception as e:
        log_info("Failed to convert CoverageDocument to Coverage")
        handle_create_core_object_error(e)
    return coverage
