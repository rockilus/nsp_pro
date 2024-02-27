from typing import List

from bson import ObjectId

from core.worker import WorkerDimension
from database.db import DB
from models import Team as TeamDocument
from models import WorkerDimension as WorkerDimensionDocument


class WorkerDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker_dimension(
        self, worker_dimension: WorkerDimension
    ) -> WorkerDimension:
        wd_data = to_mongo_worker_dimension(worker_dimension)
        wd_doc = WorkerDimensionDocument(
            id=str(ObjectId()),
            team=wd_data.team,
            name=wd_data.name,
            entry_type=wd_data.entry_type,
            entry_options=wd_data.entry_options,
        )
        wd_saved = wd_doc.save()
        return _from_mongo_worker_dimension(wd_saved)

    def get_worker_dimensions(
        self,
    ) -> List[WorkerDimension]:
        # pylint: disable=no-member
        worker_dimensions = WorkerDimensionDocument.objects.all()  # type: ignore
        return [_from_mongo_worker_dimension(wd) for wd in list(worker_dimensions)]

    def get_worker_dimension_by_id(self, worker_dimension_id: str) -> WorkerDimension:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            id=worker_dimension_id
        )
        return _from_mongo_worker_dimension(worker_dimension)

    def get_worker_dimension_by_name(
        self, worker_dimension_name: str
    ) -> WorkerDimension:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            name=worker_dimension_name
        )
        return _from_mongo_worker_dimension(worker_dimension)

    def get_worker_dimensions_by_entry_type(
        self, entry_type: str
    ) -> List[WorkerDimension]:
        # pylint: disable=no-member
        worker_dimensions = WorkerDimensionDocument.objects.filter(  # type: ignore
            entry_type=entry_type
        )
        return [_from_mongo_worker_dimension(wd) for wd in list(worker_dimensions)]

    def update_worker_dimension(
        self, worker_dimension: WorkerDimension
    ) -> WorkerDimension:
        wd_doc = to_mongo_worker_dimension(worker_dimension)
        wd_saved = wd_doc.save()
        return _from_mongo_worker_dimension(wd_saved)

    def delete_worker_dimension(self, worker_dimension_id: str) -> None:
        # pylint: disable=no-member
        worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
            id=worker_dimension_id
        )
        worker_dimension.delete()


# Mappers


def to_mongo_worker_dimension(
    dataclass_obj: WorkerDimension,
) -> WorkerDimensionDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return WorkerDimensionDocument(
        id=dataclass_obj.id,
        team=team,
        name=dataclass_obj.name,
        entry_type=dataclass_obj.entry_type,
        entry_options=dataclass_obj.entry_options,
    )


def _from_mongo_worker_dimension(
    doc_obj: WorkerDimensionDocument,
) -> WorkerDimension:
    return WorkerDimension(
        id=doc_obj.id,
        team_id=str(doc_obj.team.id),
        name=doc_obj.name,
        entry_type=doc_obj.entry_type,  # type: ignore
        entry_options=[*doc_obj.entry_options],
    )
