from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.coverage import CoverageSelector
from database.db import DB
from models import Coverage as CoverageDocument
from models import CoverageSelector as CoverageSelectorDocument


class CoverageSelectorDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage_selector(
        self, start_date: date, end_date: date
    ) -> CoverageSelector:
        coverage_selector = CoverageSelectorDocument(
            id=str(ObjectId()),
            start_date=start_date,
            end_date=end_date,
        )
        coverage_selector_saved = coverage_selector.save()
        return _from_mongo_coverage_selector(coverage_selector_saved)

    def get_coverage_selectors(
        self,
    ) -> List[CoverageSelector]:
        # pylint: disable=no-member
        coverage_selectors = CoverageSelectorDocument.objects.all()  # type: ignore
        return [_from_mongo_coverage_selector(cs) for cs in list(coverage_selectors)]

    def get_coverage_selector_by_id(
        self, coverage_selector_id: str
    ) -> CoverageSelector:
        # pylint: disable=no-member
        coverage_selector = CoverageSelectorDocument.objects.get(  # type: ignore
            id=coverage_selector_id
        )
        return _from_mongo_coverage_selector(coverage_selector)

    def get_coverage_selector_by_dates(
        self, start_date: date, end_date: date
    ) -> List[CoverageSelector]:
        # pylint: disable=no-member
        coverage_selectors = CoverageSelectorDocument.objects.filter(  # type: ignore
            start_date__lte=end_date,
            end_date__gte=start_date,
        )
        return [_from_mongo_coverage_selector(cs) for cs in list(coverage_selectors)]

    def update_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        # pylint: disable=no-member
        coverage_selector_document = to_mongo_coverage_selector(coverage_selector)
        coverage_selector_saved = coverage_selector_document.save()
        return _from_mongo_coverage_selector(coverage_selector_saved)

    def delete_coverage_selector(self, coverage_selector_id: str) -> None:
        # pylint: disable=no-member
        coverage_selector = CoverageSelectorDocument.objects.get(  # type: ignore
            id=coverage_selector_id
        )
        coverage_selector.delete()


# Mappers
def to_mongo_coverage_selector(
    dataclass_obj: CoverageSelector,
) -> CoverageSelectorDocument:
    if dataclass_obj.coverage_id != "":
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(  # type: ignore
            id=dataclass_obj.coverage_id
        )
    return CoverageSelectorDocument(
        id=dataclass_obj.id,
        start_date=dataclass_obj.start_date,
        end_date=dataclass_obj.end_date,
        coverage=coverage if dataclass_obj.coverage_id != "" else None,
    )


def _from_mongo_coverage_selector(
    doc_obj: CoverageSelectorDocument,
) -> CoverageSelector:
    start_date_datetime = datetime.combine(doc_obj.start_date, datetime.min.time())
    end_date_datetime = datetime.combine(doc_obj.end_date, datetime.min.time())
    return CoverageSelector(
        id=doc_obj.id,
        start_date=start_date_datetime,
        end_date=end_date_datetime,
        coverage_id=str(doc_obj.coverage.id) if doc_obj.coverage else "",
    )
