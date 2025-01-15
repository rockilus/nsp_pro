# mypy: disable-error-code="attr-defined"
from typing import List

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.coverage import Coverage as CoverageDocument
from shared.database.models.coverage_selector import (
    CoverageSelector as CoverageSelectorDocument,
)
from shared.database.models.schedule import Schedule as ScheduleDocument
from shared.logger.logger import log_info
from shared.schemas.errors.schema_error_handlers import (
    handle_create_schema_object_error,
)
from shared.schemas.schemas.coverage import CoverageSelector


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

    def get_coverage_selectors(self, schedule_id: str) -> List[CoverageSelector]:
        try:
            # pylint: disable=no-member
            coverage_selectors = CoverageSelectorDocument.objects.filter(
                schedule=schedule_id
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

    def delete_coverage_selectors_by_coverage_id(self, coverage_id: str) -> None:
        try:
            # pylint: disable=no-member
            cov_selects = CoverageSelectorDocument.objects.filter(  # type: ignore
                coverage=coverage_id
            )
        except Exception as e:
            log_info("Failed to get coverage selectors by coverage id to delete")
            handle_get_document_error(e)
        for cs in list(cov_selects):
            try:
                cs.delete()
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
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info("Failed to get schedule from database")
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
            schedule=schedule,
            full_period=dataclass_obj.full_period,
            start_date=dataclass_obj.start_date,
            end_date=dataclass_obj.end_date,
            # pylint: disable=possibly-used-before-assignment
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
            schedule_id=doc_obj.schedule.id,
            full_period=doc_obj.full_period,
            start_date=doc_obj.start_date.date(),
            end_date=doc_obj.end_date.date(),
            coverage_id=str(doc_obj.coverage.id) if doc_obj.coverage else "",
        )
    except Exception as e:
        log_info("Failed to convert CoverageSelectorDocument to CoverageSelector")
        handle_create_schema_object_error(e)
    return coverage_selector
