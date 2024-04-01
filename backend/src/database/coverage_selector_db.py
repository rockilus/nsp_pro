# mypy: disable-error-code="attr-defined"
from datetime import date
from typing import List

from bson import ObjectId

from core.coverage import CoverageSelector
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
from models import CoverageSelector as CoverageSelectorDocument
from models import Team as TeamDocument


class CoverageSelectorDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        cs_doc = core_to_doc_coverage_selector(coverage_selector)
        cs_doc.id = str(ObjectId())
        try:
            cs_saved = cs_doc.save()
        except Exception as e:
            log_info("Failed to save coverage selector to database")
            handle_save_document_error(e)
        return doc_to_core_coverage_selector(cs_saved)

    def get_coverage_selectors(self, team_id: str) -> List[CoverageSelector]:
        try:
            # pylint: disable=no-member
            coverage_selectors = CoverageSelectorDocument.objects.filter(
                team=team_id
            )  # type: ignore
        except Exception as e:
            log_info("Failed to get coverage selectors from database")
            handle_get_document_error(e)
        return [doc_to_core_coverage_selector(cs) for cs in list(coverage_selectors)]

    def get_coverage_selector_by_id(
        self, coverage_selector_id: str
    ) -> CoverageSelector:
        try:
            # pylint: disable=no-member
            coverage_selector = CoverageSelectorDocument.objects.get(  # type: ignore
                id=coverage_selector_id
            )
        except Exception as e:
            log_info("Failed to get coverage selector by id from database")
            handle_get_document_error(e)
        return doc_to_core_coverage_selector(coverage_selector)

    def get_coverage_selector_by_dates(
        self, start_date: date, end_date: date, team_id: str
    ) -> List[CoverageSelector]:
        try:
            # pylint: disable=no-member
            coverage_selectors = CoverageSelectorDocument.objects.filter(
                start_date__lte=end_date,
                end_date__gte=start_date,
                team=team_id,
            )
        except Exception as e:
            log_info("Failed to get coverage selectors by dates from database")
            handle_get_document_error(e)
        return [doc_to_core_coverage_selector(cs) for cs in list(coverage_selectors)]

    def update_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        cs_doc = core_to_doc_coverage_selector(coverage_selector)
        try:
            # pylint: disable=no-member
            CoverageSelectorDocument.objects.get(id=cs_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Coverage selector with id {cs_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            cs_saved = cs_doc.save()
        except Exception as e:
            log_info("Failed to update coverage selector in database")
            handle_save_document_error(e)
        return doc_to_core_coverage_selector(cs_saved)

    def delete_coverage_selector(self, coverage_selector_id: str) -> None:
        try:
            # pylint: disable=no-member
            coverage_selector = CoverageSelectorDocument.objects.get(  # type: ignore
                id=coverage_selector_id
            )
        except Exception as e:
            log_info("Failed to get coverage selector by id to delete from database")
            handle_get_document_error(e)
        try:
            coverage_selector.delete()
        except Exception as e:
            log_info("Failed to delete coverage selector from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_coverage_selector(
    dataclass_obj: CoverageSelector,
) -> CoverageSelectorDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get team from database")
        handle_get_document_error(e)
    if dataclass_obj.coverage_id != "":
        try:
            # pylint: disable=no-member
            coverage = CoverageDocument.objects.get(  # type: ignore
                id=dataclass_obj.coverage_id
            )
        except Exception as e:
            log_info("Failed to get coverage from database")
            handle_get_document_error(e)
    try:
        cs_doc = CoverageSelectorDocument(
            id=dataclass_obj.id,
            team=team,
            start_date=dataclass_obj.start_date,
            end_date=dataclass_obj.end_date,
            coverage=coverage if dataclass_obj.coverage_id != "" else None,
        )
    except Exception as e:
        log_info("Failed to convert CoverageSelector to CoverageSelectorDocument")
        handle_create_document_error(e)
    return cs_doc


# document to core
def doc_to_core_coverage_selector(
    doc_obj: CoverageSelectorDocument,
) -> CoverageSelector:
    try:
        coverage_selector = CoverageSelector(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            start_date=doc_obj.start_date.date(),
            end_date=doc_obj.end_date.date(),
            coverage_id=str(doc_obj.coverage.id) if doc_obj.coverage else "",
        )
    except Exception as e:
        log_info("Failed to convert CoverageSelectorDocument to CoverageSelector")
        handle_create_core_object_error(e)
    return coverage_selector
