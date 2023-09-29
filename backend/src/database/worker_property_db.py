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
        worker_properties = WorkerPropertyDocument.objects.filter(worker=worker.id)  # type: ignore
        return [
            _from_mongo_worker_property(wp) for wp in list(worker_properties)
        ]

    def get_worker_properties_by_worker_dimension(
        self,
        worker_dimension: WorkerDimension,
    ) -> List[WorkerProperty]:
        # pylint: disable=no-member
        worker_properties = WorkerPropertyDocument.objects.filter(  # type: ignore
            worker_dimension=worker_dimension
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
    ) -> WorkerProperty:
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
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)
    worker_dimension = WorkerDimensionDocument.objects.get(
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
