from typing import Dict, List, Union

from bson import ObjectId

from core import Shift, ShiftDimension, ShiftProperty
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Shift as ShiftDocument
from models import ShiftDimension as ShiftDimensionDocument
from models import ShiftProperty as ShiftPropertyDocument


class ShiftPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_property(self, shift_property: ShiftProperty) -> ShiftProperty:
        sp_doc = core_to_doc_shift_property(shift_property)
        sp_doc.id = str(ObjectId())
        try:
            sp_saved = sp_doc.save()
        except Exception as e:
            log_info("Failed to save shift property to database")
            handle_save_document_error(e)
        return doc_to_core_shift_property(sp_saved)

    def get_shift_properties_by_shift_id(self, shift_id: str) -> List[ShiftProperty]:
        try:
            # pylint: disable=no-member
            shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
                shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get shift properties by shift from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_property(sp) for sp in list(shift_properties)]

    def get_shift_properties_by_shift_ids(
        self, shift_ids: List[str]
    ) -> List[ShiftProperty]:
        try:
            # pylint: disable=no-member
            sp_docs = ShiftPropertyDocument.objects.filter(  # type: ignore
                shift__in=shift_ids
            )
        except Exception as e:
            log_info("Failed to get shift properties by shift ids from database")
            handle_get_document_error(e)
        try:
            shift_properties = [doc_to_core_shift_property(sp) for sp in list(sp_docs)]
        except Exception as e:
            log_info("Failed to convert WorkerPropertyDocument to WorkerProperty")
            handle_create_core_object_error(e)
        return shift_properties

    def get_shift_properties_by_shift_dimension_id(
        self, sd_id: str
    ) -> List[ShiftProperty]:
        try:
            # pylint: disable=no-member
            shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
                shift_dimension=sd_id
            )
        except Exception as e:
            log_info("Failed to get shift properties by shift dimension from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_property(sp) for sp in list(shift_properties)]

    def get_shift_property_by_id(self, shift_property_id: str) -> ShiftProperty:
        try:
            # pylint: disable=no-member
            shift_property = ShiftPropertyDocument.objects.get(  # type: ignore
                id=shift_property_id
            )
        except Exception as e:
            log_info("Failed to get shift property by id from database")
            handle_get_document_error(e)
        return doc_to_core_shift_property(shift_property)

    def get_shift_property_by_shift_and_dimension(
        self, shift: Shift, shift_dimension: ShiftDimension
    ) -> Union[ShiftProperty, None]:
        try:
            # pylint: disable=no-member
            shift_property = (
                ShiftPropertyDocument.objects.filter(shift=shift.id)  # type: ignore
                .filter(shift_dimension=shift_dimension.id)
                .first()
            )
        except Exception as e:
            log_info(
                "Failed to get shift property by shift and dimension from " + "database"
            )
            handle_get_document_error(e)
        return doc_to_core_shift_property(shift_property) if shift_property else None

    def get_shifts_id_by_dim_and_prop(self) -> Dict:
        pipeline = [
            {"$unwind": "$value"},
            {
                "$group": {
                    "_id": {
                        "shift_dimension": "$shift_dimension",
                        "value": "$value",
                    },
                    "shifts": {"$push": "$shift"},
                }
            },
            {
                "$lookup": {
                    "from": "shift_dimensions",
                    "localField": "_id.shift_dimension",
                    "foreignField": "_id",
                    "as": "shift_dimension_data",
                }
            },
            {"$unwind": "$shift_dimension_data"},
            {
                "$project": {
                    "_id": "$_id.shift_dimension",
                    "dim_name": "$shift_dimension_data.name",
                    "prop_value": "$_id.value",
                    "shifts": 1,
                }
            },
        ]
        try:
            # pylint: disable=no-member
            result = ShiftPropertyDocument.objects.aggregate(*pipeline)  # type: ignore
        except Exception as e:
            log_info("Failed to get shifts by dimension and property")
            handle_get_document_error(e)
        # pylint: disable=R0801
        out: Dict = {}
        for r in result:
            dim, dim_name, prop_value, shifts = (
                r["_id"],
                r["dim_name"].lower(),
                r["prop_value"],
                r["shifts"],
            )
            prop_value_mod = (
                prop_value.lower()
                if not isinstance(prop_value, bool)
                else dim_name
                if prop_value
                else "not " + dim_name
            )
            if dim not in out:
                out[dim] = {}
            if prop_value_mod not in out[dim]:
                out[dim][prop_value_mod] = shifts
            else:
                out[dim][prop_value_mod] += shifts
        return out

    def update_shift_property(self, shift_property: ShiftProperty) -> ShiftProperty:
        sp_doc = core_to_doc_shift_property(shift_property)
        try:
            # pylint: disable=no-member
            ShiftPropertyDocument.objects.get(id=sp_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Shift property with id {sp_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            sp_saved = sp_doc.save()
        except Exception as e:
            log_info("Failed to update shift property")
            handle_save_document_error(e)
        return doc_to_core_shift_property(sp_saved)

    def delete_shift_properties_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
                shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get shift properties by shift id to delete")
            handle_get_document_error(e)
        try:
            for shift_property in shift_properties:
                shift_property.delete()
        except Exception as e:
            log_info("Failed to delete shift properties")
            handle_delete_document_error(e)

    def delete_shift_properties_by_shift_dimension_id(
        self, shift_dimension_id: str
    ) -> None:
        try:
            # pylint: disable=no-member
            shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
                shift_dimension=shift_dimension_id
            )
        except Exception as e:
            log_info(
                "Failed to get shift properties by shift dimension id to delete: "
                + "{e}"
            )
            handle_get_document_error(e)
        try:
            for shift_property in shift_properties:
                shift_property.delete()
        except Exception as e:
            log_info("Failed to delete shift properties")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_shift_property(
    dataclass_obj: ShiftProperty,
) -> ShiftPropertyDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
            id=dataclass_obj.shift_dimension_id
        )
    except Exception as e:
        log_info("Failed to get shift dimension by id")
        handle_get_document_error(e)
    try:
        sp_doc = ShiftPropertyDocument(
            id=dataclass_obj.id,
            value=dataclass_obj.value,
            shift=shift,
            shift_dimension=shift_dimension,
        )
    except Exception as e:
        log_info("Failed to convert ShiftProperty to ShiftPropertyDocument")
        handle_create_document_error(e)
    return sp_doc


# document to core
def doc_to_core_shift_property(
    doc_obj: ShiftPropertyDocument,
) -> ShiftProperty:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict["shift_dimension_id"] = doc_dict["shift_dimension"]
    doc_dict.pop("_id")
    doc_dict.pop("shift")
    doc_dict.pop("shift_dimension")
    return ShiftProperty(**doc_dict)
