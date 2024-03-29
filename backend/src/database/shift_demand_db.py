from typing import List

from bson import ObjectId

from core.coverage import Coverage, ShiftDemand
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
            log_info(f"Failed to save shift demand to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_shift_demand(sd_saved)

    def get_shift_demand_by_id(self, shift_demand_id: str) -> ShiftDemand:
        try:
            # pylint: disable=no-member
            shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
                id=shift_demand_id
            )
        except Exception as e:
            log_info(f"Failed to get shift demand by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_shift_demand(shift_demand)

    def get_shift_demands_by_coverage(
        self, coverage: Coverage
    ) -> List[ShiftDemand]:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage.id
            )
        except Exception as e:
            log_info(
                f"Failed to get shift demands by coverage from database: {e}"
            )
            handle_get_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in list(shift_demands)]

    def get_shift_demands_by_coverage_selector(
        self, coverage_selector
    ) -> List[ShiftDemand]:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage_selector.coverage_id
            )
        except Exception as e:
            log_info(
                f"Failed to get shift demands by coverage selector from database: {e}"
            )
            handle_get_document_error(e)
        return [doc_to_core_shift_demand(sd) for sd in list(shift_demands)]

    def update_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        sd_doc = core_to_doc_shift_demand(shift_demand)
        try:
            sd_saved = sd_doc.save()
        except Exception as e:
            log_info(f"Failed to update shift demand in database: {e}")
            handle_save_document_error(e)
        return doc_to_core_shift_demand(sd_saved)

    def delete_shift_demand(self, shift_demand_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
                id=shift_demand_id
            )
        except Exception as e:
            log_info(
                f"Failed to get shift demand by id to delete from database: {e}"
            )
            handle_get_document_error(e)
        try:
            shift_demand.delete()
        except Exception as e:
            log_info(f"Failed to delete shift demand from database: {e}")
            handle_delete_document_error(e)

    def delete_shift_demands_by_coverage_id(self, coverage_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_demands = ShiftDemandDocument.objects.filter(  # type: ignore
                coverage=coverage_id
            )
        except Exception as e:
            log_info(
                f"Failed to get shift demands by coverage id to delete: {e}"
            )
            handle_get_document_error(e)
        try:
            for shift_demand in shift_demands:
                shift_demand.delete()
        except Exception as e:
            log_info(f"Failed to delete shift demands: {e}")
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
        log_info(f"Failed to get shift by id: {e}")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        coverage = CoverageDocument.objects.get(  # type: ignore
            id=dataclass_obj.coverage_id
        )
    except Exception as e:
        log_info(f"Failed to get coverage by id: {e}")
        handle_get_document_error(e)
    try:
        sd_doc = ShiftDemandDocument(
            id=dataclass_obj.id,
            day_index=dataclass_obj.day_index,
            shift=shift,
            coverage=coverage,
        )
    except Exception as e:
        log_info(f"Failed to convert ShiftDemand to ShiftDemandDocument: {e}")
        handle_create_document_error(e)
    return sd_doc


# document to core
def doc_to_core_shift_demand(doc_obj: ShiftDemandDocument) -> ShiftDemand:
    try:
        shift_demand = ShiftDemand(
            id=doc_obj.id,
            day_index=doc_obj.day_index,
            shift_id=doc_obj.shift.id,
            coverage_id=doc_obj.coverage.id,
        )
    except Exception as e:
        log_info(f"Failed to convert ShiftDemandDocument to ShiftDemand: {e}")
        handle_create_core_object_error(e)
    return shift_demand
