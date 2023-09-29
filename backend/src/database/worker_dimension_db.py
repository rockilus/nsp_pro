from typing import List

from bson import ObjectId
from core.worker import WorkerDimension
from database.db import DB
from models import WorkerDimension as WorkerDimensionDocument


class WorkerDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_worker_dimensions(
        self,
    ) -> List[WorkerDimension]:
        worker_dimension_first_name = WorkerDimensionDocument(
            id=str(ObjectId()),
            name="first_name",
            label="First Name",
            entry_type="str",
            entry_options=[],
        )
        worker_dimension_last_name = WorkerDimensionDocument(
            id=str(ObjectId()),
            name="last_name",
            label="Last Name",
            entry_type="str",
            entry_options=[],
        )
        worker_dimension_first_name.save()
        worker_dimension_last_name.save()
        # pylint: disable=no-member
        worker_dimensions = WorkerDimensionDocument.objects.all()  # type: ignore
        return [_from_mongo_worker_dimension(wd) for wd in list(worker_dimensions)]

    def create_worker_dimension(
        self,
        name: str,
        label: str,
        entry_type: str,
        entry_options: List[str],
    ) -> WorkerDimension:
        worker_dimension = WorkerDimensionDocument(
            id=str(ObjectId()),
            name=name,
            label=label,
            entry_type=entry_type,
            entry_options=entry_options,
        )
        worker_dimension_saved = worker_dimension.save()
        return _from_mongo_worker_dimension(worker_dimension_saved)

    def get_worker_dimensions(
        self,
    ) -> List[WorkerDimension]:
        # pylint: disable=no-member
        worker_dimensions = WorkerDimensionDocument.objects.all()  # type: ignore
        return [_from_mongo_worker_dimension(wd) for wd in list(worker_dimensions)]

    def get_worker_dimension_by_id(
        self,
        worker_dimension_id: str,
    ) -> WorkerDimension:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            id=worker_dimension_id
        )
        return _from_mongo_worker_dimension(worker_dimension)

    def get_worker_dimension_by_name(
        self,
        worker_dimension_name: str,
    ) -> WorkerDimension:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            name=worker_dimension_name
        )
        return _from_mongo_worker_dimension(worker_dimension)

    def update_worker_dimension(
        self, worker_dimension: WorkerDimension
    ) -> WorkerDimension:
        document = to_mongo_worker_dimension(worker_dimension)
        document_saved = document.save()
        return _from_mongo_worker_dimension(document_saved)

    def delete_worker_dimension(
        self,
        worker_dimension_id: str,
    ) -> None:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            id=worker_dimension_id
        )
        worker_dimension.delete()


# Mappers


def to_mongo_worker_dimension(
    dataclass_obj: WorkerDimension,
) -> WorkerDimensionDocument:
    return WorkerDimensionDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
        label=dataclass_obj.label,
        entry_type=dataclass_obj.entry_type,
        entry_options=dataclass_obj.entry_options,
    )


def _from_mongo_worker_dimension(
    doc_obj: WorkerDimensionDocument,
) -> WorkerDimension:
    return WorkerDimension(
        id=doc_obj.id,
        name=doc_obj.name,
        label=doc_obj.label,
        entry_type=doc_obj.entry_type,
        entry_options=[*doc_obj.entry_options],
    )
