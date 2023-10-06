from typing import List

from bson import ObjectId

from core.coverage import Coverage, ShiftDemand
from database.db import DB
from models.coverage import Coverage as CoverageDocument
from models.coverage import ShiftDemand as ShiftDemandDocument


class CoverageDB:
    def __init__(self, db: DB):
        self.db = db

    def create_coverage(
        self,
        name: str,
        shift_demands: List[ShiftDemand],
    ) -> Coverage:
        shift_demands_docs = [_to_mongo_shift_demand(d) for d in shift_demands]
        coverage = CoverageDocument(
            id=str(ObjectId()),
            name=name,
            shiftDemands=shift_demands_docs,
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
def _to_mongo_shift_demand(dataclass_obj: ShiftDemand) -> ShiftDemandDocument:
    return ShiftDemandDocument(
        dayIndex=dataclass_obj.day_index,
        shiftId=dataclass_obj.shift_id,
        quantity=dataclass_obj.quantity,
    )


def to_mongo_coverage(dataclass_obj: Coverage) -> CoverageDocument:
    return CoverageDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
        shiftDemands=[
            _to_mongo_shift_demand(shift) for shift in dataclass_obj.shift_demands
        ],
    )


def _from_mongo_shift_demand(doc_obj: ShiftDemandDocument) -> ShiftDemand:
    return ShiftDemand(
        day_index=doc_obj.dayIndex,
        shift_id=doc_obj.shiftId,
        quantity=doc_obj.quantity,
    )


def _from_mongo_coverage(doc_obj: CoverageDocument) -> Coverage:
    return Coverage(
        id=doc_obj.id,
        name=doc_obj.name,
        shift_demands=[
            _from_mongo_shift_demand(shift) for shift in doc_obj.shiftDemands
        ],
    )
