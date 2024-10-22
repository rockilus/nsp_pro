from typing import Dict, List

from bson import ObjectId

from core import Coverage, CoverageSelector, ShiftDemand
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models.coverage import Coverage as CoverageDocument
from models.shift import Shift as ShiftDocument
from models.shift_demand import ShiftDemand as ShiftDemandDocument


class ShiftDemandDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        sd_doc = core_to_doc_shift_demand(shift_demand)
        sd_doc.id = str(ObjectId())
        try:
            sd_saved = sd_doc.save()
        except Exception as e:
            log_info("Failed to save shift demand to database")
            handle_save_document_error(e)
        return doc_to_core_shift_demand(sd_saved)

    def create_shift_demands(
        self, shift_demands: List[ShiftDemand]
    ) -> List[ShiftDemand]:
        if not shift_demands:
            return []
        sd_docs = core_to_doc_shift_demands(shift_demands, creating=True)
        try:
            # pylint: disable=no-member
            sd_saved = ShiftDemandDocument.objects.insert(sd_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save shift demands to database")
            handle_save_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in sd_saved]

    def get_shift_demand_by_id(self, shift_demand_id: str) -> ShiftDemand:
        try:
            # pylint: disable=no-member
            shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
                id=shift_demand_id
            )
        except Exception as e:
            log_info("Failed to get shift demand by id from database")
            handle_get_document_error(e)
        return doc_to_core_shift_demand(shift_demand)

    def get_shift_demands_by_coverage(self, coverage: Coverage) -> List[ShiftDemand]:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage.id
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in list(shift_demands)]

    def get_shift_demands_by_coverage_ids(
        self, coverage_ids: List[str]
    ) -> List[ShiftDemand]:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage__in=coverage_ids
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage ids from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in list(shift_demands)]

    def get_cov_id_to_shift_demands_by_coverage_ids(
        self, coverage_ids: List[str]
    ) -> Dict[str, List[ShiftDemand]]:
        try:
            # pylint: disable=no-member
            sd_docs = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage__in=coverage_ids
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage ids from database")
            handle_get_document_error(e)
        try:
            shift_demands = [doc_to_core_shift_demand(sd) for sd in list(sd_docs)]
        except Exception as e:
            log_info("Failed to convert ShiftDemandDocument to ShiftDemand")
            handle_create_core_object_error(e)
        out: Dict[str, List[ShiftDemand]] = {c_id: [] for c_id in coverage_ids}
        for sd in shift_demands:
            coverage_id = sd.coverage_id
            if coverage_id not in out:
                out[coverage_id] = []
            out[coverage_id].append(sd)
        return out

    def get_shift_demands_by_coverage_selector(
        self, coverage_selector: CoverageSelector
    ) -> List[ShiftDemand]:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage_selector.coverage_id
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage selector from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in list(shift_demands)]

    def get_shift_demands_by_coverage_selectors(
        self, coverage_selectors: List[CoverageSelector]
    ) -> List[ShiftDemand]:
        coverage_ids = [cs.coverage_id for cs in coverage_selectors]
        try:
            # pylint: disable=no-member
            sd_docs = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage__in=coverage_ids
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage selectors from database")
            handle_get_document_error(e)
        try:
            shift_demands = [doc_to_core_shift_demand(sd) for sd in list(sd_docs)]
        except Exception as e:
            log_info("Failed to convert ShiftDemandDocument to ShiftDemand")
            handle_create_core_object_error(e)
        return shift_demands

    def update_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        sd_doc = core_to_doc_shift_demand(shift_demand)
        try:
            # pylint: disable=no-member
            ShiftDemandDocument.objects.get(id=sd_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Shift demand with id {sd_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            sd_saved = sd_doc.save()
        except Exception as e:
            log_info("Failed to update shift demand in database")
            handle_save_document_error(e)
        return doc_to_core_shift_demand(sd_saved)

    def delete_shift_demand(self, shift_demand_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
                id=shift_demand_id
            )
        except Exception as e:
            log_info("Failed to get shift demand by id to delete from database")
            handle_get_document_error(e)
        try:
            shift_demand.delete()
        except Exception as e:
            log_info("Failed to delete shift demand from database")
            handle_delete_document_error(e)

    def delete_shift_demands_by_coverage_id(self, coverage_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage_id
            )
        except Exception as e:
            log_info("Failed to get shift demands by coverage id to delete")
            handle_get_document_error(e)
        try:
            for shift_demand in shift_demands:
                shift_demand.delete()
        except Exception as e:
            log_info("Failed to delete shift demands")
            handle_delete_document_error(e)

    def delete_shift_demands_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get shift demands by shift id to delete")
            handle_get_document_error(e)
        try:
            for shift_demand in shift_demands:
                shift_demand.delete()
        except Exception as e:
            log_info("Failed to delete shift demands")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_shift_demand(
    dataclass_obj: ShiftDemand,
) -> ShiftDemandDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(  # type: ignore
            id=dataclass_obj.coverage_id
        )
    except Exception as e:
        log_info("Failed to get coverage by id")
        handle_get_document_error(e)
    try:
        sd_doc = ShiftDemandDocument(
            id=dataclass_obj.id,
            day_index=dataclass_obj.day_index,
            shift=shift,
            coverage=coverage,
        )
    except Exception as e:
        log_info("Failed to convert ShiftDemand to ShiftDemandDocument")
        handle_create_document_error(e)
    return sd_doc


def core_to_doc_shift_demands(
    dataclass_objs: List[ShiftDemand], creating: bool = False
) -> List[ShiftDemandDocument]:
    shift_ids = list(set(doc.shift_id for doc in dataclass_objs))
    shifts = {
        shift.id: shift
        # pylint: disable=no-member
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    coverage_ids = list(set(doc.coverage_id for doc in dataclass_objs))
    coverages = {
        coverage.id: coverage
        # pylint: disable=no-member
        for coverage in CoverageDocument.objects.filter(  # type: ignore
            id__in=coverage_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        sd_doc = ShiftDemandDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            day_index=dataclass_obj.day_index,
            shift=shifts.get(dataclass_obj.shift_id),
            coverage=coverages.get(dataclass_obj.coverage_id),
        )
        out.append(sd_doc)
    return out


# document to core
def doc_to_core_shift_demand(doc_obj: ShiftDemandDocument) -> ShiftDemand:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict["coverage_id"] = doc_dict["coverage"]
    doc_dict.pop("_id")
    doc_dict.pop("shift")
    doc_dict.pop("coverage")
    return ShiftDemand(**doc_dict)
