from typing import List, Union

from bson import ObjectId
from database.db import DB
from models import Worker, WorkerParam, WorkerProperty


class WorkerPropertyDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker_property(
        self,
        worker: Worker,
        worker_param: WorkerParam,
        value: Union[str, int, float, bool],
    ) -> WorkerProperty:
        worker_property = WorkerProperty(
            _id=ObjectId(),
            value=value,
            worker=worker,
            worker_param=worker_param,
        )
        worker_property_saved = worker_property.save()
        return worker_property_saved

    def get_worker_properties_by_worker(
        self,
        worker: Worker,
    ) -> List[WorkerProperty]:
        # pylint: disable=no-member
        worker_properties = WorkerProperty.objects.filter(worker=worker)  # type: ignore
        return list(worker_properties)

    def get_worker_properties_by_worker_param(
        self,
        worker_param: WorkerParam,
    ) -> List[WorkerProperty]:
        # pylint: disable=no-member
        worker_properties = WorkerProperty.objects.filter(  # type: ignore
            worker_param=worker_param
        )
        return list(worker_properties)

    def get_worker_property_by_id(self, worker_property_id: str) -> WorkerProperty:
        # pylint: disable=no-member
        print("worker_id in get_worker_by_id:", worker_property_id)
        worker_property = WorkerProperty.objects.get(  # type: ignore
            _id=worker_property_id
        )
        return worker_property

    def get_worker_property_by_worker_and_param(
        self,
        worker: Worker,
        worker_param: WorkerParam,
    ) -> WorkerProperty:
        # pylint: disable=no-member
        worker_property = (
            WorkerProperty.objects.filter(worker=worker)  # type: ignore
            .filter(worker_param=worker_param)
            .first()
        )
        return worker_property

    def update_worker_property(
        self,
        worker_property: WorkerProperty,
        value: Union[str, int, float, bool],
    ) -> WorkerProperty:
        worker_property.value = value
        worker_property_saved = worker_property.save()
        return worker_property_saved

    def delete_worker_properties(self, worker_properties: List[WorkerProperty]) -> None:
        for worker_property in worker_properties:
            worker_property.delete()
