from typing import List

from bson import ObjectId

from core import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuild,
    ConstraintType,
    ShiftWorkerOption,
    SWOIdTypes,
)
from database.db import DB
from errors import (  # handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Block as BlockDocument
from models import ConstraintBuild as ConstraintBuildDocument
from models import ShiftWorkerOption as ShiftWorkerOptionDocument
from models import Team as TeamDocument


class ConstraintBuildDB:
    def __init__(self, db: DB):
        self.db = db

    def create_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_doc = core_to_doc_constraint_build(constraint_build)
        cb_doc.id = str(ObjectId())
        try:
            cb_saved = cb_doc.save()
        except Exception as e:
            log_info('Failed to save constraint build to database')
            handle_save_document_error(e)
        return doc_to_core_constraint_build(cb_saved)

    def get_constraint_builds(self, team_id: str) -> List[ConstraintBuild]:
        try:
            # pylint: disable=no-member
            cb_docs = ConstraintBuildDocument.objects(team=team_id)  # type: ignore
        except Exception as e:
            log_info('Failed to get constraint build documents from database')
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_builds_active(
        self, team_id: str
    ) -> List[ConstraintBuild]:
        try:
            # pylint: disable=no-member
            cb_docs = ConstraintBuildDocument.objects(  # type: ignore
                active=True, team=team_id
            )
        except Exception as e:
            log_info(
                'Failed to get active constraint build documents from database'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def get_constraint_build_by_id(
        self, constraint_build_id: str
    ) -> ConstraintBuild:
        try:
            # pylint: disable=no-member
            cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
                id=constraint_build_id
            )
        except Exception as e:
            log_info('Failed to get constraint build by id from database')
            handle_get_document_error(e)
        return doc_to_core_constraint_build(cb_doc)

    def get_constraint_builds_by_ids(
        self, constraint_build_ids: List[str]
    ) -> List[ConstraintBuild]:
        try:
            # pylint: disable=no-member
            cb_docs = ConstraintBuildDocument.objects(  # type: ignore
                id__in=constraint_build_ids
            )
        except Exception as e:
            log_info(
                'Failed to get active constraint build by ids from database'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

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
            log_info(
                'Failed to get constraint build by worker id from database'
            )
            handle_get_document_error(e)
        return [doc_to_core_constraint_build(cb) for cb in list(cb_docs)]

    def update_constraint_build(
        self, constraint_build: ConstraintBuild
    ) -> ConstraintBuild:
        cb_doc = core_to_doc_constraint_build(constraint_build)
        try:
            # pylint: disable=no-member
            ConstraintBuildDocument.objects.get(id=cb_doc.id)  # type: ignore
        except Exception as e:
            log_info(f'Constraint build with id {cb_doc.id} does not exist')
            handle_get_document_error(e)
        try:
            cb_doc_saved = cb_doc.save()
        except Exception as e:
            log_info('Failed to update constraint build document')
            handle_save_document_error(e)
        return doc_to_core_constraint_build(cb_doc_saved)

    def delete_constraint_build(self, constraint_build_id: str) -> None:
        try:
            # pylint: disable=no-member
            cb_doc = ConstraintBuildDocument.objects.get(  # type: ignore
                id=constraint_build_id
            )
        except Exception as e:
            log_info('Failed to get constraint build by id to delete')
            handle_get_document_error(e)
        try:
            cb_doc.delete()
        except Exception as e:
            log_info('Failed to delete constraint build')
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_shift_worker_option(
    dataclass_obj: ShiftWorkerOption,
) -> ShiftWorkerOptionDocument:
    try:
        shift_worker_option_doc = ShiftWorkerOptionDocument(
            name=dataclass_obj.name,
            id=dataclass_obj.id,
            id_type=dataclass_obj.id_type.value,
            is_bool_dim=dataclass_obj.is_bool_dim,
            category_name=dataclass_obj.category_name,
        )
    except Exception as e:
        log_info(
            'Failed to convert ShiftWorkerOption to ShiftWorkerOptionDocument'
        )
        handle_create_document_error(e)
    return shift_worker_option_doc


def core_to_doc_block(dataclass_obj: Block) -> BlockDocument:
    try:
        block_doc = BlockDocument(
            name=dataclass_obj.name.value,
            type=dataclass_obj.type.value,
            value=(
                [
                    core_to_doc_shift_worker_option(v)  # type: ignore
                    for v in dataclass_obj.value  # type: ignore
                ]
                if dataclass_obj.type == BlockTypeOptions.SHIFT_WORKER_OPTION
                else dataclass_obj.value
            ),
        )
    except Exception as e:
        log_info('Failed to convert Block to BlockDocument')
        handle_create_document_error(e)
    return block_doc


def core_to_doc_constraint_build(
    dataclass_obj: ConstraintBuild,
) -> ConstraintBuildDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info('Failed to get team from database')
        handle_get_document_error(e)
    try:
        cb_doc = ConstraintBuildDocument(
            id=dataclass_obj.id,
            team=team,
            constraint_type=dataclass_obj.constraint_type.value,
            template_id=dataclass_obj.template_id,
            language=dataclass_obj.language,
            blocks=[core_to_doc_block(b) for b in dataclass_obj.blocks],
            hard=dataclass_obj.hard,
            priority=dataclass_obj.priority,
        )
    except Exception as e:
        log_info(
            'Failed to convert ConstraintBuild to ConstraintBuildDocument'
        )
        handle_create_document_error(e)
    return cb_doc


# document to core
def doc_to_core_shift_worker_option(
    doc_obj: ShiftWorkerOptionDocument,
) -> ShiftWorkerOption:
    if not isinstance(doc_obj, ShiftWorkerOptionDocument):
        if doc_obj.get("_cls") == "ShiftWorkerOption":
            doc_obj = ShiftWorkerOptionDocument(**doc_obj)
        else:
            raise ValueError(
                f'Invalid document type: {type(doc_obj)} for ShiftWorkerOption'
            )
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id_type"] = SWOIdTypes(doc_dict["id_type"])
    return ShiftWorkerOption(**doc_dict)


def doc_to_core_block(doc_obj: BlockDocument) -> Block:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["name"] = BlockNameOptions(doc_dict["name"])
    doc_dict["type"] = BlockTypeOptions(doc_dict["type"])
    if doc_dict["type"] == BlockTypeOptions.SHIFT_WORKER_OPTION:
        doc_dict["value"] = [
            doc_to_core_shift_worker_option(v) for v in doc_dict["value"]
        ]
    return Block(**doc_dict)
    # try:
    #     block = Block(
    #         name=doc_obj.name,  # type: ignore
    #         type=doc_obj.type,  # type: ignore
    #         value=(
    #             [doc_to_core_shift_worker_option(v) for v in doc_obj.value]
    #             if doc_obj.type == "shift_worker_option"
    #             else (
    #                 doc_obj.value
    #                 if isinstance(doc_obj.value, (str, int))
    #                 else list(doc_obj.value)
    #             )
    #         ),
    #     )
    # except Exception as e:
    #     log_info('Failed to convert BlockDocument to Block')
    #     handle_create_core_object_error(e)
    # return block


def doc_to_core_constraint_build(
    doc_obj: ConstraintBuildDocument,
) -> ConstraintBuild:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["constraint_type"] = ConstraintType(doc_dict["constraint_type"])
    doc_dict["blocks"] = [doc_to_core_block(b) for b in doc_obj.blocks]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    return ConstraintBuild(**doc_dict)

    # try:
    #     if doc_obj.constraint_type not in [
    #         'sum',
    #         'seq',
    #         'ord',
    #         'fil',
    #         'fai',
    #         'eve',
    #     ]:
    #         raise ValueError(
    #             f'Invalid constraint_type: {doc_obj.constraint_type}'
    #         )
    #     constraint_build = ConstraintBuild(
    #         id=doc_obj.id,
    #         team_id=doc_obj.team.id,
    #         constraint_type=doc_obj.constraint_type,  # type: ignore
    #         template_id=doc_obj.template_id,
    #         language=doc_obj.language,
    #         blocks=[doc_to_core_block(b) for b in doc_obj.blocks],
    #         hard=doc_obj.hard,
    #         priority=doc_obj.priority,
    #     )
    # except Exception as e:
    #     log_info(
    #         'Failed to convert ConstraintBuildDocument to ConstraintBuild'
    #     )
    #     handle_create_core_object_error(e)
    # return constraint_build
