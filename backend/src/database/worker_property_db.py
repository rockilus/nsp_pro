from typing import List, Union

from bson import ObjectId

from core.worker import Worker, WorkerDimension, WorkerProperty
from database.db import DB
from database.worker_db import to_mongo_worker
from database.worker_dimension_db import to_mongo_worker_dimension
from models import Worker as WorkerDocument
from models import WorkerDimension as WorkerDimensionDocument
from models import WorkerProperty as WorkerPropertyDocument


class WorkerPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker_property(
        self,
        worker: Worker,
        worker_dimension: WorkerDimension,
        value: Union[str, int, float, bool],
    ) -> WorkerProperty:
        worker_property = WorkerPropertyDocument(
            id=str(ObjectId()),
            value=value,
            worker=to_mongo_worker(worker),
            worker_dimension=to_mongo_worker_dimension(worker_dimension),
        )
        worker_property_saved = worker_property.save()
        return _from_mongo_worker_property(worker_property_saved)

    def get_worker_properties_by_worker(
        self,
        worker: Worker,
    ) -> List[WorkerProperty]:
        # pylint: disable=no-member
        worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
            worker=worker.id
        )
        return [
            _from_mongo_worker_property(wp) for wp in list(worker_properties)
        ]

    def get_worker_properties_by_worker_dimension(
        self,
        worker_dimension: WorkerDimension,
    ) -> List[WorkerProperty]:
        # pylint: disable=no-member
        worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
            worker_dimension=worker_dimension.id
        )
        return [
            _from_mongo_worker_property(wp) for wp in list(worker_properties)
        ]

    def get_worker_property_by_id(
        self, worker_property_id: str
    ) -> WorkerProperty:
        # pylint: disable=no-member
        worker_property = WorkerPropertyDocument.objects.get(  # type: ignore
            _id=worker_property_id
        )
        return _from_mongo_worker_property(worker_property)

    def get_worker_property_by_worker_and_dimension(
        self,
        worker: Worker,
        worker_dimension: WorkerDimension,
    ) -> Union[WorkerProperty, None]:
        # pylint: disable=no-member
        worker_property = (
            WorkerPropertyDocument.objects.filter(worker=worker.id)  # type: ignore
            .filter(worker_dimension=worker_dimension.id)
            .first()
        )
        return (
            _from_mongo_worker_property(worker_property)
            if worker_property
            else None
        )

    def get_workers_id_by_dim_and_prop(self):
        pipeline_study = [
            # Group by worker_dimension id
            # Return an iterable of dicts in format:
            # {
            #     "_id": "worker_dimension_id",
            #     "properties": [{"value": "value", "worker": "worker_id"}]
            # }
            {
                "$group": {
                    "_id": "$worker_dimension",
                    "properties": {
                        "$push": {"value": "$value", "worker": "$worker"}
                    },
                }
            },
            # Unwind the properties list
            # Return an iterable of dicts in format (instead of having a list
            # of properties for each worker_dimension, each item of the
            # properties list is now its own dict):
            # {
            #     "_id": "worker_dimension_id",
            #     "properties": {"value": "value", "worker": "worker_id"}
            # }
            {"$unwind": "$properties"},
            # Group by worker_dimension id and property value
            # Return an iterable of dicts in format:
            # {
            #     "_id": {
            #         "worker_dimension": "worker_dimension_id",
            #         "value": "value",
            #     },
            #     "workers": ["worker_ids"]
            # }
            {
                "$group": {
                    "_id": {
                        "worker_dimension": "$_id",
                        "value": "$properties.value",
                    },
                    "workers": {"$push": "$properties.worker"},
                }
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
            {"$unwind": "$worker_dimension_data"},
            # Reshapes the documents by specifying which fields to include,
            # exclude, or manipulate before the final output:
            # Fields to include as is: _id, value, workers
            # New field worker_dimension: _id field of worker_dimension_data
            # Return an iterable of dicts in format:
            # {
            #     "_id": {
            #         "worker_dimension": "worker_dimension_id",
            #         "value": "value",
            #     },
            #     "workers": ["worker_ids"]
            #     "worker_dimension": worker_dimension_id
            # }
            {
                "$project": {
                    "_id": 1,
                    "worker_dimension": "$worker_dimension_data._id",
                    "value": 1,
                    "workers": 1,
                }
            },
        ]

        pipeline = [
            {
                "$group": {
                    "_id": {
                        "worker_dimension": "$worker_dimension",
                        "prop_value": "$value",
                    },
                    "workers": {"$push": "$worker"},
                },
            },
            {
                "$lookup": {
                    "from": "worker_dimensions",
                    "localField": "_id.worker_dimension",
                    "foreignField": "_id",
                    "as": "worker_dimension_data",
                }
            },
            {"$unwind": "$worker_dimension_data"},
            {
                "$project": {
                    "_id": "$_id.worker_dimension",
                    "dim_name": "$worker_dimension_data.name",
                    "prop_value": "$_id.prop_value",
                    "workers": 1,
                }
            },
        ]

        # pylint: disable=no-member
        result = WorkerPropertyDocument.objects.aggregate(*pipeline)  # type: ignore
        out = {}
        for r in result:
            dim, dim_name, prop_value, workers = (
                r["_id"],
                r["dim_name"].lower(),
                r["prop_value"].lower(),
                r["workers"],
            )
            prop_value_mod = (
                prop_value
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

    def update_worker_property(
        self,
        worker_property: WorkerProperty,
    ) -> WorkerProperty:
        document = _to_mongo_worker_property(worker_property)
        document_saved = document.save()
        return _from_mongo_worker_property(document_saved)

    def delete_worker_properties_by_worker_id(self, worker_id: str) -> None:
        # pylint: disable=no-member
        worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
            worker=worker_id
        )
        for worker_property in worker_properties:
            worker_property.delete()

    def delete_worker_properties_by_worker_dimension_id(
        self, worker_dimension_id: str
    ) -> None:
        # pylint: disable=no-member
        worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
            worker_dimension=worker_dimension_id
        )
        for worker_property in worker_properties:
            worker_property.delete()


# Mappers
def _to_mongo_worker_property(
    dataclass_obj: WorkerProperty,
) -> WorkerPropertyDocument:
    # pylint: disable=no-member
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
        id=dataclass_obj.worker_dimension_id
    )
    return WorkerPropertyDocument(
        id=dataclass_obj.id,
        value=dataclass_obj.value,
        worker=worker,
        worker_dimension=worker_dimension,
    )


def _from_mongo_worker_property(
    doc_obj: WorkerPropertyDocument,
) -> WorkerProperty:
    return WorkerProperty(
        id=doc_obj.id,
        value=doc_obj.value,
        worker_id=doc_obj.worker.id,
        worker_dimension_id=doc_obj.worker_dimension.id,
    )
