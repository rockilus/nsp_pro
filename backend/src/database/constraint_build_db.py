from typing import List

from bson import ObjectId

from core.constraint import Block, ConstraintBuild, MissingProperty
from database.db import DB
from models import Block as BlockDocument
from models import ConstraintBuild as ConstraintBuildDocument
from models import MissingProperty as MissingPropertyDocument
from models import Team as TeamDocument


class ConstraintBuildDB:
    def __init__(self, db: DB):
        self.db = db

    def create_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_data = to_mongo_constraint_build(constraint_build)
        cb_doc = ConstraintBuildDocument(
            id=str(ObjectId()),
            team=cb_data.team,
            constraint_type=cb_data.constraint_type,
            template_id=cb_data.template_id,
            blocks=[to_mongo_block(b) for b in cb_data.blocks],
            text=cb_data.text,
            hard=cb_data.hard,
            priority=cb_data.priority,
            active=cb_data.active,
        )
        cb_saved = cb_doc.save()
        return _from_mongo_constraint_build(cb_saved)

    def get_constraint_builds(self, team_id: str) -> List[ConstraintBuild]:
        # pylint: disable=no-member
        cb_docs = ConstraintBuildDocument.objects(team=team_id)  # type: ignore
        return [_from_mongo_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_active(self, team_id: str) -> List[ConstraintBuild]:
        # pylint: disable=no-member
        cb_docs = ConstraintBuildDocument.objects(  # type: ignore
            active=True, team=team_id
        )
        return [_from_mongo_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_build_by_id(self, constraint_build_id: str) -> ConstraintBuild:
        # pylint: disable=no-member
        cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
            id=constraint_build_id
        )
        return _from_mongo_constraint_build(cb_doc)

    def get_constraint_builds_by_worker_id(
        self, worker_id: str
    ) -> List[ConstraintBuild]:
        # pylint: disable=no-member
        cb_docs = ConstraintBuildDocument.objects(  # type: ignore
            __raw__={
                'blocks': {
                    '$elemMatch': {
                        'name': 'worker',
                        'value': {
                            '$elemMatch': {
                                'id': worker_id,
                                'id_type': 'worker',
                            }
                        },
                    }
                }
            }
        )
        return [_from_mongo_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_by_wd_id_and_wp_value(
        self, wd_id: str, wp_value: str | int | float | bool
    ) -> List[ConstraintBuild]:
        # pylint: disable=no-member
        cb_docs = ConstraintBuildDocument.objects(  # type: ignore
            __raw__={
                'blocks': {
                    '$elemMatch': {
                        'name': 'worker',
                        'value': {
                            '$elemMatch': {
                                'name': wp_value,
                                'id': wd_id,
                                'id_type': 'worker_dimension',
                            }
                        },
                    }
                }
            }
        )
        return [_from_mongo_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_by_worker_dimension_id(
        self, wd_id: str
    ) -> List[ConstraintBuild]:
        # pylint: disable=no-member
        cb_docs = ConstraintBuildDocument.objects(  # type: ignore
            __raw__={
                'blocks': {
                    '$elemMatch': {
                        'name': 'worker',
                        'value': {
                            '$elemMatch': {
                                'id': wd_id,
                                'id_type': 'worker_dimension',
                            }
                        },
                    }
                }
            }
        )
        return [_from_mongo_constraint_build(cb) for cb in list(cb_docs)]

    def update_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_doc = to_mongo_constraint_build(constraint_build)
        cb_doc_saved = cb_doc.save()
        return _from_mongo_constraint_build(cb_doc_saved)

    def delete_constraint_build(self, constraint_build_id: str) -> None:
        # pylint: disable=no-member
        cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
            id=constraint_build_id
        )
        cb_doc.delete()


# Mappers
# Block
def to_mongo_block(dataclass_obj: Block) -> BlockDocument:
    return BlockDocument(
        name=dataclass_obj.name,
        type=dataclass_obj.type,
        value=dataclass_obj.value,
    )


def _from_mongo_block(doc_obj: BlockDocument) -> Block:
    return Block(
        name=doc_obj.name,  # type: ignore
        type=doc_obj.type,  # type: ignore
        value=(
            doc_obj.value
            if isinstance(doc_obj.value, (str, int))
            else list(doc_obj.value)
        ),
    )


# MissingProperty
def to_mongo_missing_property(
    dataclass_obj: MissingProperty,
) -> MissingPropertyDocument:
    return MissingPropertyDocument(
        dimension_id=dataclass_obj.dimension_id,
        property_values=dataclass_obj.property_values,
    )


def _from_mongo_missing_property(
    doc_obj: MissingPropertyDocument,
) -> MissingProperty:
    return MissingProperty(
        dimension_id=doc_obj.dimension_id,
        property_values=list(doc_obj.property_values),
    )


# Constraint build
def to_mongo_constraint_build(
    dataclass_obj: ConstraintBuild,
) -> ConstraintBuildDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return ConstraintBuildDocument(
        id=dataclass_obj.id,
        team=team,
        constraint_type=dataclass_obj.constraint_type,
        template_id=dataclass_obj.template_id,
        blocks=[to_mongo_block(b) for b in dataclass_obj.blocks],
        text=dataclass_obj.text,
        hard=dataclass_obj.hard,
        priority=dataclass_obj.priority,
        active=dataclass_obj.active,
        missing_properties=[
            to_mongo_missing_property(mp) for mp in dataclass_obj.missing_properties
        ],
    )


def _from_mongo_constraint_build(
    doc_obj: ConstraintBuildDocument,
) -> ConstraintBuild:
    return ConstraintBuild(
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        constraint_type=doc_obj.constraint_type,  # type: ignore
        template_id=doc_obj.template_id,
        blocks=[_from_mongo_block(b) for b in doc_obj.blocks],
        text=doc_obj.text,
        hard=doc_obj.hard,
        priority=doc_obj.priority,
        active=doc_obj.active,
        missing_properties=[
            _from_mongo_missing_property(mp) for mp in doc_obj.missing_properties
        ],
    )
