from typing import List

from bson import ObjectId

from core.coverage import Coverage
from database.db import DB
from models import Coverage as CoverageDocument
from models import Team as TeamDocument


class CoverageDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage(self, coverage: Coverage) -> Coverage:
        c_data = to_mongo_coverage(coverage)
        c_doc = CoverageDocument(
            id=str(ObjectId()),
            team=c_data.team,
            name=c_data.name,
        )
        c_saved = c_doc.save()
        return _from_mongo_coverage(c_saved)

    def get_coverages(self, team_id: str) -> List[Coverage]:
        # pylint: disable=no-member
        coverages = CoverageDocument.objects(team=team_id)  # type: ignore
        return [_from_mongo_coverage(c) for c in list(coverages)]

    def get_coverage_by_id(self, coverage_id: str) -> Coverage:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        return _from_mongo_coverage(coverage)

    def update_coverage(self, coverage: Coverage) -> Coverage:
        c_doc = to_mongo_coverage(coverage)
        c_saved = c_doc.save()
        return _from_mongo_coverage(c_saved)

    def delete_coverage(self, coverage_id: str) -> None:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        coverage.delete()


# Mappers
def to_mongo_coverage(dataclass_obj: Coverage) -> CoverageDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return CoverageDocument(
        id=dataclass_obj.id,
        team=team,
        name=dataclass_obj.name,
    )


def _from_mongo_coverage(doc_obj: CoverageDocument) -> Coverage:
    return Coverage(
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        name=doc_obj.name,
    )
