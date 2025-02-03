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

    def get_coverage_selectors_by_schedule_id_full_period(
        self, schedule_id: str
    ) -> List[CoverageSelector]:
        try:
            # pylint: disable=no-member
            coverage_selectors = CoverageSelectorDocument.objects.filter(
                schedule=schedule_id, full_period=True
            )  # type: ignore
        except Exception as e:
            log_info("Failed to get coverage selectors by schedule id and full period")
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

    def update_coverage_selectors(
        self, coverage_selectors: List[CoverageSelector]
    ) -> List[CoverageSelector]:
        cs_docs = core_to_doc_coverage_selectors(coverage_selectors)
        try:
            for cs_doc in cs_docs:
                cs_doc.save()
        except Exception as e:
            log_info("Failed to update coverage selectors in database")
            handle_save_document_error(e)
        return [doc_to_core_coverage_selector(cs) for cs in list(cs_docs)]

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


# pylint: disable=R0801
def core_to_doc_coverage_selectors(
    dataclass_objs: List[CoverageSelector],
) -> List[CoverageSelectorDocument]:
    schedule_ids = list(set(doc.schedule_id for doc in dataclass_objs))
    # pylint: disable=no-member
    schedules = {
        schedule.id: schedule
        for schedule in ScheduleDocument.objects.filter(  # type: ignore
            id__in=schedule_ids
        )
    }
    coverage_ids = list(
        set(doc.coverage_id for doc in dataclass_objs if doc.coverage_id != "")
    )
    coverages = {
        coverage.id: coverage
        for coverage in CoverageDocument.objects.filter(  # type: ignore
            id__in=coverage_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        cs_doc = CoverageSelectorDocument(
            id=dataclass_obj.id,
            schedule=schedules.get(dataclass_obj.schedule_id),
            full_period=dataclass_obj.full_period,
            start_date=dataclass_obj.start_date,
            end_date=dataclass_obj.end_date,
            # pylint: disable=possibly-used-before-assignment
            coverage=(
                coverages.get(dataclass_obj.coverage_id)
                if dataclass_obj.coverage_id != ""
                else None
            ),
        )
        out.append(cs_doc)
    return out


# document to core
def doc_to_core_coverage_selector(
    doc_obj: CoverageSelectorDocument,
) -> CoverageSelector:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict["start_date"] = doc_dict["start_date"].date()
    doc_dict["end_date"] = doc_dict["end_date"].date()
    doc_dict["coverage_id"] = doc_dict.get("coverage", None)
    doc_dict.pop("_id")
    doc_dict.pop("schedule")
    if "coverage" in doc_dict:
        doc_dict.pop("coverage")
    return CoverageSelector(**doc_dict)

    # try:
    #     coverage_selector = CoverageSelector(
    #         id=doc_obj.id,
    #         schedule_id=doc_obj.schedule.id,
    #         full_period=doc_obj.full_period,
    #         start_date=doc_obj.start_date.date(),
    #         end_date=doc_obj.end_date.date(),
    #         coverage_id=str(doc_obj.coverage.id) if doc_obj.coverage else "",
    #     )
    # except Exception as e:
    #     log_info(
    #         "Failed to convert CoverageSelectorDocument to CoverageSelector"
    #     )
    #     handle_create_schema_object_error(e)
    # return coverage_selector
