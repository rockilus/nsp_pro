from typing import List

from bson import ObjectId

from core.constraint import Block, ConstraintBuild, MissingProperty
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import Block as BlockDocument
from models import ConstraintBuild as ConstraintBuildDocument
from models import MissingProperty as MissingPropertyDocument
from models import Team as TeamDocument
from services.logging import log_info


class ConstraintBuildDB:
    def __init__(self, db: DB):
        self.db = db

    def create_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_data = core_to_doc_constraint_build(constraint_build)
        cb_doc = ConstraintBuildDocument(
            id=str(ObjectId()),
            team=cb_data.team,
            constraint_type=cb_data.constraint_type,
            template_id=cb_data.template_id,
            blocks=[core_to_doc_block(b) for b in cb_data.blocks],
            text=cb_data.text,
            hard=cb_data.hard,
            priority=cb_data.priority,
            active=cb_data.active,
        )
        try:
            cb_saved = cb_doc.save()
        except Exception as e:
            log_info(f'Failed to save constraint build document to database: {e}')
            handle_save_document_error(e)
        return doc_to_core_constraint_build(cb_saved)

    def get_constraint_builds(self, team_id: str) -> List[ConstraintBuild]:
        try:
            # pylint: disable=no-member
            cb_docs = ConstraintBuildDocument.objects(team=team_id)  # type: ignore
        except Exception as e:
            log_info(f'Failed to get constraint build documents from database: {e}')
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_active(self, team_id: str) -> List[ConstraintBuild]:
        try:
            # pylint: disable=no-member
            cb_docs = ConstraintBuildDocument.objects(  # type: ignore
                active=True, team=team_id
            )
        except Exception as e:
            log_info(
                f'Failed to get active constraint build documents from database: {e}'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_build_by_id(self, constraint_build_id: str) -> ConstraintBuild:
        try:
            # pylint: disable=no-member
            cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
                id=constraint_build_id
            )
        except Exception as e:
            log_info(f'Failed to get constraint build by id from database: {e}')
            handle_get_document_error(e)
        return doc_to_core_constraint_build(cb_doc)

    def get_constraint_builds_by_worker_id(
        self, worker_id: str
    ) -> List[ConstraintBuild]:
        try:
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
        except Exception as e:
            log_info(f'Failed to get constraint build by worker id from database: {e}')
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_by_wd_id_and_wp_value(
        self, wd_id: str, wp_value: str | int | float | bool
    ) -> List[ConstraintBuild]:
        try:
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
        except Exception as e:
            log_info(
                'Failed to get constraint build by worker dimension id and '
                + f'worker property value from database: {e}'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_by_worker_dimension_id(
        self, wd_id: str
    ) -> List[ConstraintBuild]:
        try:
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
        except Exception as e:
            log_info(
                'Failed to get constraint build by worker dimension id from '
                + f'database: {e}'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def update_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_doc = core_to_doc_constraint_build(constraint_build)
        try:
            cb_doc_saved = cb_doc.save()
        except Exception as e:
            log_info(f'Failed to update constraint build document: {e}')
            handle_save_document_error(e)
        return doc_to_core_constraint_build(cb_doc_saved)

    def delete_constraint_build(self, constraint_build_id: str) -> None:
        try:
            # pylint: disable=no-member
            cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
                id=constraint_build_id
            )
        except Exception as e:
            log_info(f'Failed to get constraint build by id to delete: {e}')
            handle_get_document_error(e)
        try:
            cb_doc.delete()
        except Exception as e:
            log_info(f'Failed to delete constraint build: {e}')
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_block(dataclass_obj: Block) -> BlockDocument:
    try:
        block_doc = BlockDocument(
            name=dataclass_obj.name,
            type=dataclass_obj.type,
            value=dataclass_obj.value,
        )
    except Exception as e:
        log_info(f'Failed to convert Block to BlockDocument: {e}')
        handle_create_document_error(e)
    return block_doc


def core_to_doc_missing_property(
    dataclass_obj: MissingProperty,
) -> MissingPropertyDocument:
    try:
        mp_doc = MissingPropertyDocument(
            dimension_id=dataclass_obj.dimension_id,
            property_values=dataclass_obj.property_values,
        )
    except Exception as e:
        log_info(f'Failed to convert MissingProperty to MissingPropertyDocument: {e}')
        handle_create_document_error(e)
    return mp_doc


def core_to_doc_constraint_build(
    dataclass_obj: ConstraintBuild,
) -> ConstraintBuildDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f'Failed to get team from database: {e}')
        handle_get_document_error(e)
    try:
        cb_doc = ConstraintBuildDocument(
            id=dataclass_obj.id,
            team=team,
            constraint_type=dataclass_obj.constraint_type,
            template_id=dataclass_obj.template_id,
            blocks=[core_to_doc_block(b) for b in dataclass_obj.blocks],
            text=dataclass_obj.text,
            hard=dataclass_obj.hard,
            priority=dataclass_obj.priority,
            active=dataclass_obj.active,
            missing_properties=[
                core_to_doc_missing_property(mp)
                for mp in dataclass_obj.missing_properties
            ],
        )
    except Exception as e:
        log_info(f'Failed to convert ConstraintBuild to ConstraintBuildDocument: {e}')
        handle_create_document_error(e)
    return cb_doc


# document to core
def doc_to_core_block(doc_obj: BlockDocument) -> Block:
    try:
        block = Block(
            name=doc_obj.name,  # type: ignore
            type=doc_obj.type,  # type: ignore
            value=(
                doc_obj.value
                if isinstance(doc_obj.value, (str, int))
                else list(doc_obj.value)
            ),
        )
    except Exception as e:
        log_info(f'Failed to convert BlockDocument to Block: {e}')
        handle_create_core_object_error(e)
    return block


def doc_to_core_missing_property(
    doc_obj: MissingPropertyDocument,
) -> MissingProperty:
    try:
        missing_property = MissingProperty(
            dimension_id=doc_obj.dimension_id,
            property_values=list(doc_obj.property_values),
        )
    except Exception as e:
        log_info(f'Failed to convert MissingPropertyDocument to MissingProperty: {e}')
        handle_create_core_object_error(e)
    return missing_property


def doc_to_core_constraint_build(
    doc_obj: ConstraintBuildDocument,
) -> ConstraintBuild:
    try:
        constraint_build = ConstraintBuild(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            constraint_type=doc_obj.constraint_type,  # type: ignore
            template_id=doc_obj.template_id,
            blocks=[doc_to_core_block(b) for b in doc_obj.blocks],
            text=doc_obj.text,
            hard=doc_obj.hard,
            priority=doc_obj.priority,
            active=doc_obj.active,
            missing_properties=[
                doc_to_core_missing_property(mp) for mp in doc_obj.missing_properties
            ],
        )
    except Exception as e:
        log_info(f'Failed to convert ConstraintBuildDocument to ConstraintBuild: {e}')
        handle_create_core_object_error(e)
    return constraint_build
