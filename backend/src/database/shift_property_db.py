from typing import Dict, List, Union

from bson import ObjectId

from core import Dimension, Shift, ShiftProperty
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Dimension as DimensionDocument
from models import DimEntry as DimEntryDocument
from models import Shift as ShiftDocument
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

    def create_shift_properties(
        self, shift_properties: List[ShiftProperty]
    ) -> List[ShiftProperty]:
        sp_docs = core_to_doc_shift_properties(shift_properties, creating=True)
        try:
            # pylint: disable=no-member
            sp_saved = ShiftPropertyDocument.objects.insert(sp_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save shift properties to database")
            handle_save_document_error(e)
        return [doc_to_core_shift_property(sp) for sp in sp_saved]

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

    def get_shift_properties_by_sd_id_for_not_deleted_s(
        self, sd_id: str
    ) -> List[ShiftProperty]:
        try:
            pipeline = [
                {"$match": {"shift_dimension": sd_id}},
                {
                    "$lookup": {
                        "from": "shifts",
                        "localField": "shift",
                        "foreignField": "_id",
                        "as": "shift",
                    }
                },
                {"$unwind": "$shift"},
                {"$match": {"shift.deleted": False}},
                {
                    "$project": {
                        "id": "$_id",
                        "_id": 0,
                        "value": 1,
                        "shift": "$shift._id",
                        "shift_dimension": 1,
                    }
                },
            ]
            # pylint: disable=no-member
            result = ShiftPropertyDocument.objects.aggregate(pipeline)  # type: ignore
            # for doc in result:
            #     print(doc)
            shift_properties = [ShiftPropertyDocument(**doc) for doc in result]
        except Exception as e:
            log_info(
                "Failed to get shift properties by shift dimension id for not "
                + "deleted shift from database"
            )
            handle_get_document_error(e)
            return []

        return [doc_to_core_shift_property(sp) for sp in shift_properties]

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
        self, shift: Shift, shift_dimension: Dimension
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
            dim, _, prop_value, shifts = (
                r["_id"],
                r["dim_name"].lower(),
                r["prop_value"],
                r["shifts"],
            )
            prop_value_mod = (
                prop_value.lower() if not isinstance(prop_value, bool) else prop_value
            )
            if dim not in out:
                out[dim] = {}
            if prop_value_mod not in out[dim]:
                out[dim][prop_value_mod] = shifts
            else:
                out[dim][prop_value_mod] += shifts
        return out

    def get_shift_properties_by_dim_entry_id(
        self, dim_entry_id: str
    ) -> List[ShiftProperty]:
        try:
            # pylint: disable=no-member
            shift_properties = ShiftPropertyDocument.objects.filter(  # type: ignore
                dim_entry_ids__contains=dim_entry_id
            )
        except Exception as e:
            log_info("Failed to get shift properties by dim entry id from database")
            handle_get_document_error(e)
        return [doc_to_core_shift_property(sp) for sp in list(shift_properties)]

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

    def update_shift_properties(
        self, shift_properties: List[ShiftProperty]
    ) -> List[ShiftProperty]:
        sp_docs = core_to_doc_shift_properties(shift_properties)
        try:
            for sp_doc in sp_docs:
                sp_doc.save()
        except Exception as e:
            log_info("Failed to update shift properties")
            handle_save_document_error(e)
        return [doc_to_core_shift_property(sp) for sp in sp_docs]

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
        shift_dimension = DimensionDocument.objects.get(  # type: ignore
            id=dataclass_obj.dimension_id
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


def core_to_doc_shift_properties(
    dataclass_objs: List[ShiftProperty], creating: bool = False
) -> List[ShiftPropertyDocument]:
    shift_ids = list(set(doc.shift_id for doc in dataclass_objs))
    shifts = {
        shift.id: shift
        # pylint: disable=no-member
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    dimension_ids = list(set(doc.dimension_id for doc in dataclass_objs))
    dimensions = {
        dimension.id: dimension
        # pylint: disable=no-member
        for dimension in DimensionDocument.objects.filter(  # type: ignore
            id__in=dimension_ids
        )
    }
    dim_entry_ids = list(
        set(
            dim_entry_id for doc in dataclass_objs for dim_entry_id in doc.dim_entry_ids
        )
    )
    dim_entries = {
        dim_entry.id: dim_entry
        # pylint: disable=no-member
        for dim_entry in DimEntryDocument.objects.filter(  # type: ignore
            id__in=dim_entry_ids
        )
    }
    out = []
    for dataclass_obj in dataclass_objs:
        sp_doc = ShiftPropertyDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            value=dataclass_obj.value,
            shift=shifts.get(dataclass_obj.shift_id),
            shift_dimension=dimensions.get(dataclass_obj.dimension_id),
            dim_entries=[
                dim_entries.get(dim_entry_id)
                for dim_entry_id in dataclass_obj.dim_entry_ids
            ],
        )
        out.append(sp_doc)
    return out


# document to core
def doc_to_core_shift_property(
    doc_obj: ShiftPropertyDocument,
) -> ShiftProperty:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict["shift_dimension_id"] = doc_dict["shift_dimension"]
    doc_dict["dim_entry_ids"] = [
        str(dim_entry.id) for dim_entry in doc_dict["dim_entries"]
    ]
    doc_dict.pop("_id")
    doc_dict.pop("shift")
    doc_dict.pop("shift_dimension")
    doc_dict.pop("dim_entries")
    return ShiftProperty(**doc_dict)
