from typing import Dict, List, Union

from bson import ObjectId

from core import Attribute, AttributeOwnerType, Dimension, Shift
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Attribute as AttributeDocument
from models import Dimension as DimensionDocument
from models import DimEntry as DimEntryDocument
from models import Shift as ShiftDocument
from models import Worker as WorkerDocument


class ShiftPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_attribute(self, attribute: Attribute) -> Attribute:
        p_doc = core_to_doc_attribute(attribute)
        p_doc.id = str(ObjectId())
        try:
            p_saved = p_doc.save()
        except Exception as e:
            log_info("Failed to save property to database")
            handle_save_document_error(e)
        return doc_to_core_attribute(p_saved)

    def create_attributes(
        self, attributes: List[Attribute]
    ) -> List[Attribute]:
        a_docs = core_to_doc_attributes(attributes, creating=True)
        try:
            # pylint: disable=no-member
            a_saved = AttributeDocument.objects.insert(a_docs)  # type: ignore
        except Exception as e:
            log_info("Failed to save attributes to database")
            handle_save_document_error(e)
        return [doc_to_core_attribute(sp) for sp in a_saved]

    def get_attributes_by_owner_id(self, owner_id: str) -> List[Attribute]:
        try:
            # pylint: disable=no-member
            a_docs = AttributeDocument.objects.filter(  # type: ignore
                owner=owner_id
            )
        except Exception as e:
            log_info("Failed to get attributes by owner from database")
            handle_get_document_error(e)
        return [doc_to_core_attribute(a) for a in list(a_docs)]

    def get_shift_properties_by_shift_ids(
        self, shift_ids: List[str]
    ) -> List[Attribute]:
        try:
            # pylint: disable=no-member
            sp_docs = AttributeDocument.objects.filter(  # type: ignore
                shift__in=shift_ids
            )
        except Exception as e:
            log_info(
                "Failed to get shift properties by shift ids from database"
            )
            handle_get_document_error(e)
        try:
            shift_properties = [
                doc_to_core_attribute(sp) for sp in list(sp_docs)
            ]
        except Exception as e:
            log_info(
                "Failed to convert WorkerPropertyDocument to WorkerProperty"
            )
            handle_create_core_object_error(e)
        return shift_properties

    def get_shift_properties_by_dimension_id(
        self, dimension_id: str
    ) -> List[Attribute]:
        try:
            # pylint: disable=no-member
            shift_properties = AttributeDocument.objects.filter(  # type: ignore
                dimension=dimension_id
            )
        except Exception as e:
            log_info(
                "Failed to get shift properties by dimension from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_attribute(sp) for sp in list(shift_properties)]

    def get_shift_properties_by_dimension_id_for_not_deleted_s(
        self, dimension_id: str
    ) -> List[Attribute]:
        try:
            pipeline = [
                {"$match": {"dimension": dimension_id}},
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
                        "dimension": 1,
                    }
                },
            ]
            # pylint: disable=no-member
            result = AttributeDocument.objects.aggregate(pipeline)  # type: ignore
            # for doc in result:
            #     print(doc)
            shift_properties = [AttributeDocument(**doc) for doc in result]
        except Exception as e:
            log_info(
                "Failed to get shift properties by dimension id for not "
                + "deleted shift from database"
            )
            handle_get_document_error(e)
            return []

        return [doc_to_core_attribute(sp) for sp in shift_properties]

    def get_shift_property_by_id(self, shift_property_id: str) -> Attribute:
        try:
            # pylint: disable=no-member
            shift_property = AttributeDocument.objects.get(  # type: ignore
                id=shift_property_id
            )
        except Exception as e:
            log_info("Failed to get shift property by id from database")
            handle_get_document_error(e)
        return doc_to_core_attribute(shift_property)

    def get_shift_property_by_shift_and_dimension(
        self, shift: Shift, dimension: Dimension
    ) -> Union[Attribute, None]:
        try:
            # pylint: disable=no-member
            shift_property = (
                AttributeDocument.objects.filter(shift=shift.id)  # type: ignore
                .filter(dimension=dimension.id)
                .first()
            )
        except Exception as e:
            log_info(
                "Failed to get shift property by shift and dimension from "
                + "database"
            )
            handle_get_document_error(e)
        return (
            doc_to_core_attribute(shift_property) if shift_property else None
        )

    def get_shifts_id_by_dim_and_prop(self) -> Dict:
        pipeline = [
            {"$unwind": "$value"},
            {
                "$group": {
                    "_id": {
                        "dimension": "$dimension",
                        "value": "$value",
                    },
                    "shifts": {"$push": "$shift"},
                }
            },
            {
                "$lookup": {
                    "from": "dimensions",
                    "localField": "_id.dimension",
                    "foreignField": "_id",
                    "as": "dimension_data",
                }
            },
            {"$unwind": "$dimension_data"},
            {
                "$project": {
                    "_id": "$_id.dimension",
                    "dim_name": "$dimension_data.name",
                    "prop_value": "$_id.value",
                    "shifts": 1,
                }
            },
        ]
        try:
            # pylint: disable=no-member
            result = AttributeDocument.objects.aggregate(*pipeline)  # type: ignore
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
                prop_value.lower()
                if not isinstance(prop_value, bool)
                else prop_value
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
    ) -> List[Attribute]:
        try:
            # pylint: disable=no-member
            shift_properties = AttributeDocument.objects.filter(  # type: ignore
                dim_entries__contains=dim_entry_id
            )
        except Exception as e:
            log_info(
                "Failed to get shift properties by dim entry id from database"
            )
            handle_get_document_error(e)
        return [doc_to_core_attribute(sp) for sp in shift_properties]

    def update_shift_property(self, shift_property: Attribute) -> Attribute:
        sp_doc = core_to_doc_attribute(shift_property)
        try:
            # pylint: disable=no-member
            AttributeDocument.objects.get(id=sp_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Shift property with id {sp_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            sp_saved = sp_doc.save()
        except Exception as e:
            log_info("Failed to update shift property")
            handle_save_document_error(e)
        return doc_to_core_attribute(sp_saved)

    def update_shift_properties(
        self, shift_properties: List[Attribute]
    ) -> List[Attribute]:
        sp_docs = core_to_doc_attributes(shift_properties)
        try:
            for sp_doc in sp_docs:
                sp_doc.save()
        except Exception as e:
            log_info("Failed to update shift properties")
            handle_save_document_error(e)
        return [doc_to_core_attribute(sp) for sp in sp_docs]

    def delete_shift_properties_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_properties = AttributeDocument.objects.filter(  # type: ignore
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

    def delete_shift_properties_by_dimension_id(
        self, dimension_id: str
    ) -> None:
        try:
            # pylint: disable=no-member
            shift_properties = AttributeDocument.objects.filter(  # type: ignore
                dimension=dimension_id
            )
        except Exception as e:
            log_info(
                "Failed to get shift properties by dimension id to delete: {e}"
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
def core_to_doc_attribute(dataclass_obj: Attribute) -> AttributeDocument:
    # pylint: disable=R0801
    try:
        if dataclass_obj.owner_type == AttributeOwnerType.SHIFT:
            # pylint: disable=no-member
            shift = ShiftDocument.objects.get(id=dataclass_obj.owner_id)  # type: ignore
        elif dataclass_obj.owner_type == AttributeOwnerType.WORKER:
            # pylint: disable=no-member
            worker = WorkerDocument.objects.get(  # type: ignore
                id=dataclass_obj.owner_id
            )
        else:
            raise ValueError("Invalid owner type in attribute")
        # pylint: disable=no-member
        dimension = DimensionDocument.objects.get(  # type: ignore
            id=dataclass_obj.dimension_id
        )
        # pylint: disable=no-member
        dim_entries = DimEntryDocument.objects.filter(  # type: ignore
            id__in=dataclass_obj.dim_entry_ids
        )
    except Exception as e:
        log_info("Failed to get shift, worker, dimension or dim entries by id")
        handle_get_document_error(e)
    try:
        sp_doc = AttributeDocument(
            id=dataclass_obj.id,
            value=dataclass_obj.value,
            owner_type=dataclass_obj.owner_type.value,
            owner=dataclass_obj.owner_id,
            dimension=dimension,
            dim_entries=dim_entries,
        )
    except Exception as e:
        log_info("Failed to convert Attribute to AttributeDocument")
        handle_create_document_error(e)
    return sp_doc


def core_to_doc_attributes(
    dataclass_objs: List[Attribute], creating: bool = False
) -> List[AttributeDocument]:
    shift_ids = list(
        set(
            doc.owner_id
            for doc in dataclass_objs
            if doc.owner_type == AttributeOwnerType.SHIFT
        )
    )
    shifts = {
        shift.id: shift
        # pylint: disable=no-member
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    worker_ids = list(
        set(
            doc.owner_id
            for doc in dataclass_objs
            if doc.owner_type == AttributeOwnerType.WORKER
        )
    )
    workers = {
        worker.id: worker
        # pylint: disable=no-member
        for worker in WorkerDocument.objects.filter(id__in=worker_ids)  # type: ignore
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
            dim_entry_id
            for doc in dataclass_objs
            for dim_entry_id in doc.dim_entry_ids
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
        sp_doc = AttributeDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            value=dataclass_obj.value,
            owner_type=dataclass_obj.owner_type.value,
            owner=(
                shifts.get(dataclass_obj.owner_id)
                if dataclass_obj.owner_type == AttributeOwnerType.SHIFT
                else workers.get(dataclass_obj.owner_id)
            ),
            dimension=dimensions.get(dataclass_obj.dimension_id),
            dim_entries=[
                dim_entries.get(dim_entry_id)
                for dim_entry_id in dataclass_obj.dim_entry_ids
            ],
        )
        out.append(sp_doc)
    return out


# document to core
def doc_to_core_attribute(
    doc_obj: AttributeDocument,
) -> Attribute:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["owner_type"] = AttributeOwnerType(doc_dict["owner_type"])
    doc_dict["owner_id"] = doc_dict["owner"]
    doc_dict["dimension_id"] = doc_dict["dimension"]
    doc_dict["dim_entry_ids"] = doc_dict["dim_entries"]
    doc_dict.pop("_id")
    doc_dict.pop("owner")
    doc_dict.pop("dimension")
    doc_dict.pop("dim_entries")
    return Attribute(**doc_dict)
