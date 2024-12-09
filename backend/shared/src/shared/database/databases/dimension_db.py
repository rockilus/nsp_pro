from typing import List

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.dimension import Dimension as DimensionDocument
from shared.database.models.team import Team as TeamDocument
from shared.logger.logger import log_info
from shared.schemas.errors.schema_error_handlers import (
    handle_create_schema_object_error,
)
from shared.schemas.schemas.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)


class DimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_dimension(self, dimension: Dimension) -> Dimension:
        d_doc = core_to_doc_dimension(dimension)
        d_doc.id = str(ObjectId())
        try:
            d_saved = d_doc.save()
        except Exception as e:
            log_info("Failed to save dimension to database")
            handle_save_document_error(e)
        return doc_to_core_dimension(d_saved)

    def get_dimensions_by_dim_types_not_deleted(
        self, dim_type: List[DimensionType], team_id: str
    ) -> List[Dimension]:
        try:
            # pylint: disable=no-member
            d_docs = DimensionDocument.objects.filter(  # type: ignore
                team=team_id,
                dim_types__in=[dt.value for dt in dim_type],
                deleted=False,
            )
        except Exception as e:
            log_info("Failed to get dimensions by type not deleted from database")
            handle_get_document_error(e)
        return [doc_to_core_dimension(sd) for sd in list(d_docs)]

    def get_dimension_by_id(self, dimension_id: str) -> Dimension:
        try:
            # pylint: disable=no-member
            dimension = DimensionDocument.objects.get(id=dimension_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dimension by id from database")
            handle_get_document_error(e)
        return doc_to_core_dimension(dimension)

    def get_dimensions_by_dim_types_and_entry_type(
        self,
        dim_types: List[DimensionType],
        entry_type: DimensionEntryType,
        team_id: str,
    ) -> List[Dimension]:
        try:
            # pylint: disable=no-member
            d_docs = DimensionDocument.objects.filter(  # type: ignore
                entry_type=entry_type.value,
                team=team_id,
                dim_types__in=[dt.value for dt in dim_types],
            )
        except Exception as e:
            log_info("Failed to get shift dimensions by entry type from database")
            handle_get_document_error(e)
        return [doc_to_core_dimension(sd) for sd in list(d_docs)]

    def get_dimensions(self, team_id: str) -> List[Dimension]:
        try:
            # pylint: disable=no-member
            d_docs = DimensionDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dimensions from database")
            handle_get_document_error(e)
        return [doc_to_core_dimension(d) for d in d_docs]

    def get_dimensions_not_deleted(self, team_id: str) -> List[Dimension]:
        try:
            # pylint: disable=no-member
            d_docs = DimensionDocument.objects.filter(  # type: ignore
                team=team_id, deleted=False
            )
        except Exception as e:
            log_info("Failed to get dimensions not deleted from database")
            handle_get_document_error(e)
        return [doc_to_core_dimension(d) for d in d_docs]

    def update_dimension(self, dimension: Dimension) -> Dimension:
        d_doc = core_to_doc_dimension(dimension)
        try:
            # pylint: disable=no-member
            DimensionDocument.objects.get(id=d_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Dimension with id {d_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            d_saved = d_doc.save()
        except Exception as e:
            log_info("Failed to update dimension to database")
            handle_save_document_error(e)
        return doc_to_core_dimension(d_saved)

    def delete_dimension(self, dimension_id: str) -> None:
        try:
            # pylint: disable=no-member
            d_doc = DimensionDocument.objects.get(id=dimension_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dimension by id to delete")
            handle_get_document_error(e)
        try:
            d_doc.delete()
        except Exception as e:
            log_info("Failed to delete dimension")
            handle_delete_document_error(e)

    def logical_delete_dimension(self, dimension_id: str) -> None:
        try:
            # pylint: disable=no-member
            d_doc = DimensionDocument.objects.get(id=dimension_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dimension by id to logical delete")
            handle_get_document_error(e)
        try:
            d_doc.update(set__deleted=True)
        except Exception as e:
            log_info("Failed to logical delete dimension")
            handle_save_document_error(e)


# Mappers
# core to document
# pylint: disable=R0801
def core_to_doc_dimension(
    dataclass_obj: Dimension,
) -> DimensionDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get team from database")
        handle_get_document_error(e)
    try:
        d_doc = DimensionDocument(
            # pylint: disable=R0801
            id=dataclass_obj.id,
            team=team,
            dim_types=[dt.value for dt in dataclass_obj.dim_types],
            name=dataclass_obj.name,
            entry_type=dataclass_obj.entry_type.value,
            deleted=dataclass_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert Dimension to DimensionDocument")
        handle_create_document_error(e)
    return d_doc


# document to core
def doc_to_core_dimension(
    doc_obj: DimensionDocument,
) -> Dimension:
    try:
        dimension = Dimension(
            # pylint: disable=R0801
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            dim_types=[DimensionType(dt) for dt in doc_obj.dim_types],
            name=doc_obj.name,
            entry_type=DimensionEntryType(doc_obj.entry_type),
            deleted=doc_obj.deleted,
        )
    except Exception as e:
        log_info("Failed to convert DimensionDocument to Dimension")
        handle_create_schema_object_error(e)
    return dimension
