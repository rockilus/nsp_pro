from typing import List

from bson import ObjectId

from core.coverage import Coverage
from database.db import DB
from models.coverage import Coverage as CoverageDocument


class CoverageDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage(
        self,
        name: str,
    ) -> Coverage:
        coverage = CoverageDocument(
            id=str(ObjectId()),
            name=name,
        )
        coverage_saved = coverage.save()
        return _from_mongo_coverage(coverage_saved)

    def get_coverages(self) -> List[Coverage]:
        # pylint: disable=no-member
        coverages = CoverageDocument.objects.all()  # type: ignore
        return [_from_mongo_coverage(c) for c in list(coverages)]

    def get_coverage_by_id(self, coverage_id: str) -> Coverage:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        return _from_mongo_coverage(coverage)

    def update_coverage(self, coverage: Coverage) -> Coverage:
        document = to_mongo_coverage(coverage)
        document_saved = document.save()
        return _from_mongo_coverage(document_saved)

    def delete_coverage(self, coverage_id: str) -> None:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(id=coverage_id)  # type: ignore
        coverage.delete()


# Mappers
def to_mongo_coverage(dataclass_obj: Coverage) -> CoverageDocument:
    return CoverageDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
    )


def _from_mongo_coverage(doc_obj: CoverageDocument) -> Coverage:
    return Coverage(
        id=doc_obj.id,
        name=doc_obj.name,
    )
