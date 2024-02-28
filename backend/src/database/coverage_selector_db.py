from datetime import date
from typing import List

from bson import ObjectId

from core.coverage import CoverageSelector
from database.db import DB
from models import Coverage as CoverageDocument
from models import CoverageSelector as CoverageSelectorDocument
from models import Team as TeamDocument


class CoverageSelectorDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        cs_data = to_mongo_coverage_selector(coverage_selector)
        cs_doc = CoverageSelectorDocument(
            id=str(ObjectId()),
            team=cs_data.team,
            start_date=cs_data.start_date,
            end_date=cs_data.end_date,
        )
        cs_saved = cs_doc.save()
        return _from_mongo_coverage_selector(cs_saved)

    def get_coverage_selectors(self, team_id: str) -> List[CoverageSelector]:
        # pylint: disable=no-member
        coverage_selectors = CoverageSelectorDocument.objects.filter(  # type: ignore
            team=team_id
        )
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
        self, start_date: date, end_date: date, team_id: str
    ) -> List[CoverageSelector]:
        # pylint: disable=no-member
        coverage_selectors = CoverageSelectorDocument.objects.filter(  # type: ignore
            start_date__lte=end_date,
            end_date__gte=start_date,
            team=team_id,
        )
        return [_from_mongo_coverage_selector(cs) for cs in list(coverage_selectors)]

    def update_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> CoverageSelector:
        # pylint: disable=no-member
        cs_doc = to_mongo_coverage_selector(coverage_selector)
        cs_saved = cs_doc.save()
        return _from_mongo_coverage_selector(cs_saved)

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
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    if dataclass_obj.coverage_id != "":
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(  # type: ignore
            id=dataclass_obj.coverage_id
        )
    return CoverageSelectorDocument(
        id=dataclass_obj.id,
        team=team,
        start_date=dataclass_obj.start_date,
        end_date=dataclass_obj.end_date,
        coverage=coverage if dataclass_obj.coverage_id != "" else None,
    )


def _from_mongo_coverage_selector(
    doc_obj: CoverageSelectorDocument,
) -> CoverageSelector:
    return CoverageSelector(
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        start_date=doc_obj.start_date.date(),
        end_date=doc_obj.end_date.date(),
        coverage_id=str(doc_obj.coverage.id) if doc_obj.coverage else "",
    )
