from typing import List

from bson import ObjectId

from core.coverage import Coverage, ShiftDemand
from database.db import DB
from models.coverage import Coverage as CoverageDocument
from models.shift import Shift as ShiftDocument
from models.shift_demand import ShiftDemand as ShiftDemandDocument


class ShiftDemandDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        sd_data = _to_mongo_shift_demand(shift_demand)
        sd_doc = ShiftDemandDocument(
            id=str(ObjectId()),
            day_index=sd_data.day_index,
            shift=sd_data.shift,
            coverage=sd_data.coverage,
        )
        sd_saved = sd_doc.save()
        return _from_mongo_shift_demand(sd_saved)

    def get_shift_demand_by_id(self, shift_demand_id: str) -> ShiftDemand:
        # pylint: disable=no-member
        shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
            id=shift_demand_id
        )
        return _from_mongo_shift_demand(shift_demand)

    def get_shift_demands_by_coverage(self, coverage: Coverage) -> List[ShiftDemand]:
        # pylint: disable=no-member
        shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
            coverage=coverage.id
        )
        return [_from_mongo_shift_demand(sd) for sd in list(shift_demands)]

    def get_shift_demands_by_coverage_selector(
        self, coverage_selector
    ) -> List[ShiftDemand]:
        # pylint: disable=no-member
        shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
            coverage=coverage_selector.coverage_id
        )
        return [_from_mongo_shift_demand(sd) for sd in list(shift_demands)]

    def update_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        sd_doc = _to_mongo_shift_demand(shift_demand)
        sd_saved = sd_doc.save()
        return _from_mongo_shift_demand(sd_saved)

    def delete_shift_demand(self, shift_demand_id: str) -> None:
        # pylint: disable=no-member
        shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
            id=shift_demand_id
        )
        shift_demand.delete()

    def delete_shift_demands_by_coverage_id(self, coverage_id: str) -> None:
        # pylint: disable=no-member
        shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
            coverage=coverage_id
        )
        for shift_demand in shift_demands:
            shift_demand.delete()


# Mappers
def _to_mongo_shift_demand(dataclass_obj: ShiftDemand) -> ShiftDemandDocument:
    # pylint: disable=no-member
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    coverage = CoverageDocument.objects.get(  # type: ignore
        id=dataclass_obj.coverage_id
    )
    return ShiftDemandDocument(
        id=dataclass_obj.id,
        day_index=dataclass_obj.day_index,
        shift=shift,
        coverage=coverage,
    )


def _from_mongo_shift_demand(doc_obj: ShiftDemandDocument) -> ShiftDemand:
    return ShiftDemand(
        id=doc_obj.id,
        day_index=doc_obj.day_index,
        shift_id=doc_obj.shift.id,
        coverage_id=doc_obj.coverage.id,
    )
