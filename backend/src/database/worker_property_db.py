from typing import Dict, List, Union

from bson import ObjectId

from core.worker import Worker, WorkerDimension, WorkerProperty
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Worker as WorkerDocument
from models import WorkerDimension as WorkerDimensionDocument
from models import WorkerProperty as WorkerPropertyDocument


class WorkerPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker_property(self, worker_property: WorkerProperty) -> WorkerProperty:
        wp_doc = core_to_doc_worker_property(worker_property)
        wp_doc.id = str(ObjectId())
        try:
            wp_saved = wp_doc.save()
        except Exception as e:
            log_info("Failed to save worker property to database")
            handle_save_document_error(e)
        return doc_to_core_worker_property(wp_saved)

    def get_worker_properties_by_worker_id(
        self, worker_id: str
    ) -> List[WorkerProperty]:
        try:
            # pylint: disable=no-member
            worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
                worker=worker_id
            )
        except Exception as e:
            log_info("Failed to get worker properties by worker id from database")
            handle_get_document_error(e)
        return [doc_to_core_worker_property(wp) for wp in list(worker_properties)]

    def get_worker_properties_by_worker_dimension_id(
        self, wd_id: str
    ) -> List[WorkerProperty]:
        try:
            # pylint: disable=no-member
            worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
                worker_dimension=wd_id
            )
        except Exception as e:
            log_info(
                "Failed to get worker properties by worker dimension id from "
                + "database"
            )
            handle_get_document_error(e)
        return [doc_to_core_worker_property(wp) for wp in list(worker_properties)]

    def get_worker_property_by_id(self, worker_property_id: str) -> WorkerProperty:
        try:
            # pylint: disable=no-member
            worker_property = WorkerPropertyDocument.objects.get(  # type: ignore
                _id=worker_property_id
            )
        except Exception as e:
            log_info("Failed to get worker property by id from database")
            handle_get_document_error(e)
        return doc_to_core_worker_property(worker_property)

    def get_worker_property_by_worker_and_dimension(
        self, worker: Worker, worker_dimension: WorkerDimension
    ) -> Union[WorkerProperty, None]:
        try:
            # pylint: disable=no-member
            worker_property = (
                WorkerPropertyDocument.objects.filter(worker=worker.id)  # type: ignore
                .filter(worker_dimension=worker_dimension.id)
                .first()
            )
        except Exception as e:
            log_info(
                "Failed to get worker property by worker and dimension from "
                + "database"
            )
            handle_get_document_error(e)
        return doc_to_core_worker_property(worker_property) if worker_property else None

    def get_workers_id_by_dim_and_prop(self) -> Dict:
        # pipeline_study = [
        #     # Group by worker_dimension id
        #     # Return an iterable of dicts in format:
        #     # {
        #     #     "_id": "worker_dimension_id",
        #     #     "properties": [{"value": "value", "worker": "worker_id"}]
        #     # }
        #     {
        #         "$group": {
        #             "_id": "$worker_dimension",
        #             "properties": {"$push": {"value": "$value", "worker": "$worker"}},
        #         }
        #     },
        #     # Unwind the properties list
        #     # Return an iterable of dicts in format (instead of having a list
        #     # of properties for each worker_dimension, each item of the
        #     # properties list is now its own dict):
        #     # {
        #     #     "_id": "worker_dimension_id",
        #     #     "properties": {"value": "value", "worker": "worker_id"}
        #     # }
        #     {"$unwind": "$properties"},
        #     # Group by worker_dimension id and property value
        #     # Return an iterable of dicts in format:
        #     # {
        #     #     "_id": {
        #     #         "worker_dimension": "worker_dimension_id",
        #     #         "value": "value",
        #     #     },
        #     #     "workers": ["worker_ids"]
        #     # }
        #     {
        #         "$group": {
        #             "_id": {
        #                 "worker_dimension": "$_id",
        #                 "value": "$properties.value",
        #             },
        #             "workers": {"$push": "$properties.worker"},
        #         }
        #     },
        #     # Lookup worker_dimension by id and store it in
        #     # "worker_dimension_data" field (it will be a list with one element)
        #     # Return an iterable of dicts in format:
        #     # {
        #     #     "_id": {
        #     #         "worker_dimension": "worker_dimension_id",
        #     #         "value": "value",
        #     #     },
        #     #     "workers": ["worker_ids"]
        #     #     "worker_dimension_data": [worker_dimension]
        #     # }
        #     {
        #         "$lookup": {
        #             "from": "worker_dimensions",
        #             "localField": "_id.worker_dimension",
        #             "foreignField": "_id",
        #             "as": "worker_dimension_data",
        #         }
        #     },
        #     # Unwind the worker_dimension_data list
        #     {"$unwind": "$worker_dimension_data"},
        #     # Reshapes the documents by specifying which fields to include,
        #     # exclude, or manipulate before the final output:
        #     # Fields to include as is: _id, value, workers
        #     # New field worker_dimension: _id field of worker_dimension_data
        #     # Return an iterable of dicts in format:
        #     # {
        #     #     "_id": {
        #     #         "worker_dimension": "worker_dimension_id",
        #     #         "value": "value",
        #     #     },
        #     #     "workers": ["worker_ids"]
        #     #     "worker_dimension": worker_dimension_id
        #     # }
        #     {
        #         "$project": {
        #             "_id": 1,
        #             "worker_dimension": "$worker_dimension_data._id",
        #             "value": 1,
        #             "workers": 1,
        #         }
        #     },
        # ]

        pipeline = [
            {"$unwind": "$value"},
            # Group by worker_dimension id and property value
            # Return an iterable of dicts in format:
            # {
            #     "_id": {
            #         "worker_dimension": "worker_dimension_id",
            #         "prop_value": "value",
            #     },
            #     "workers": ["worker_ids"]
            # }
            {
                "$group": {
                    "_id": {
                        "worker_dimension": "$worker_dimension",
                        "prop_value": "$value",
                    },
                    "workers": {"$push": "$worker"},
                },
            },
            # Lookup worker_dimension by id and store it in
            # "worker_dimension_data" field (it will be a list with one element)
            # Return an iterable of dicts in format:
            # {
            #     "_id": {
            #         "worker_dimension": "worker_dimension_id",
            #         "value": "value",
            #     },
            #     "workers": ["worker_ids"]
            #     "worker_dimension_data": [worker_dimension]
            # }
            {
                "$lookup": {
                    "from": "worker_dimensions",
                    "localField": "_id.worker_dimension",
                    "foreignField": "_id",
                    "as": "worker_dimension_data",
                }
            },
            # Unwind the worker_dimension_data list
            # Return an iterable of dicts in format (instead of having a list
            # of worker_dimension_data for each object, each item of the
            # worker_dimension_data list is now its own dict):
            # {
            #     "_id": {
            #         "worker_dimension": "worker_dimension_id",
            #         "value": "value",
            #     },
            #     "workers": ["worker_ids"]
            #     "worker_dimension_data": worker_dimension
            # }
            {"$unwind": "$worker_dimension_data"},
            # Reshapes the documents by specifying which fields to include,
            # exclude, or manipulate before the final output:
            # Fields to include as is: workers
            # New fields:
            #  - _id: worker_dimension fild of _id
            #  - dim_name: name field of worker_dimension_data
            #  - prop_value: prop_value field of _id
            # Return an iterable of dicts in format:
            # {
            #     "_id": worker_dimension_id
            #     "dim_name": worker_dimension_name,
            #     "prop_value": worker_property_value,
            #     "workers": ["worker_ids"]
            # }
            {
                "$project": {
                    "_id": "$_id.worker_dimension",
                    "dim_name": "$worker_dimension_data.name",
                    "prop_value": "$_id.prop_value",
                    "workers": 1,
                }
            },
        ]
        try:
            # pylint: disable=no-member
            result = WorkerPropertyDocument.objects.aggregate(*pipeline)  # type: ignore
        except Exception as e:
            log_info(
                "Failed to get workers id by dimensions and property values "
                + "from database"
            )
            handle_get_document_error(e)
        out: Dict = {}
        for r in result:
            dim, dim_name, prop_value, workers = (
                r["_id"],
                r["dim_name"].lower(),
                r["prop_value"],
                r["workers"],
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
                out[dim][prop_value_mod] = workers
            else:
                out[dim][prop_value_mod] += workers
        return out

    def update_worker_property(self, worker_property: WorkerProperty) -> WorkerProperty:
        document = core_to_doc_worker_property(worker_property)
        try:
            # pylint: disable=no-member
            WorkerPropertyDocument.objects.get(id=document.id)  # type: ignore
        except Exception as e:
            log_info(f"Worker property with id {document.id} does not exist")
            handle_get_document_error(e)
        try:
            document_saved = document.save()
        except Exception as e:
            log_info("Failed to update worker property")
            handle_save_document_error(e)
        return doc_to_core_worker_property(document_saved)

    def delete_worker_properties_by_worker_id(self, worker_id: str) -> None:
        try:
            # pylint: disable=no-member
            worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
                worker=worker_id
            )
        except Exception as e:
            log_info("Failed to get worker properties by worker id to delete")
            handle_get_document_error(e)
        try:
            for worker_property in worker_properties:
                worker_property.delete()
        except Exception as e:
            log_info("Failed to delete worker properties")
            handle_delete_document_error(e)

    def delete_worker_properties_by_worker_dimension_id(
        self, worker_dimension_id: str
    ) -> None:
        try:
            # pylint: disable=no-member
            worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
                worker_dimension=worker_dimension_id
            )
        except Exception as e:
            log_info(
                "Failed to get worker properties by worker dimension id to delete: "
                + "{e}"
            )
            handle_get_document_error(e)
        try:
            for worker_property in worker_properties:
                worker_property.delete()
        except Exception as e:
            log_info("Failed to delete worker properties")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_worker_property(
    dataclass_obj: WorkerProperty,
) -> WorkerPropertyDocument:
    try:
        # pylint: disable=no-member
        worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get worker by id for worker property")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            id=dataclass_obj.worker_dimension_id
        )
    except Exception as e:
        log_info("Failed to get worker dimension by id for worker property")
        handle_get_document_error(e)
    try:
        wp_doc = WorkerPropertyDocument(
            id=dataclass_obj.id,
            value=dataclass_obj.value,
            worker=worker,
            worker_dimension=worker_dimension,
        )
    except Exception as e:
        log_info("Failed to convert WorkerProperty to WorkerPropertyDocument")
        handle_create_document_error(e)
    return wp_doc


# document to core
def doc_to_core_worker_property(
    doc_obj: WorkerPropertyDocument,
) -> WorkerProperty:
    try:
        worker_property = WorkerProperty(
            id=doc_obj.id,
            value=doc_obj.value,
            worker_id=doc_obj.worker.id,
            worker_dimension_id=doc_obj.worker_dimension.id,
        )
    except Exception as e:
        log_info("Failed to convert WorkerPropertyDocument to WorkerProperty")
        handle_create_core_object_error(e)
    return worker_property
