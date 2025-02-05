from typing import List

from bson import ObjectId

from shared.database.databases.constraint_build_db import (
    core_to_doc_shift_worker_option,
    doc_to_core_shift_worker_option,
)
from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.stats_header import StatsHeader as StatsHeaderDocument
from shared.database.models.team import Team as TeamDocument
from shared.logger.logger import log_info
from shared.schemas.errors.schema_error_handlers import (
    handle_create_schema_object_error,
)
from shared.schemas.schemas.stats import (
    HeaderUnitOptions,
    StatsHeader,
    StatsUnitOptions,
)


class StatsHeaderDB:
    def __init__(self, db: DB):
        self.db = db

    def create_stats_header(self, stats_header: StatsHeader) -> StatsHeader:
        try:
            sh_doc = core_to_doc_stats_header(stats_header)
        except Exception as e:
            log_info("Failed to convert StatsHeader to StatsHeaderDocument")
            handle_create_document_error(e)
        sh_doc.id = str(ObjectId())
        try:
            sh_saved = sh_doc.save()
        except Exception as e:
            log_info("Failed to save stats_header to database")
            handle_save_document_error(e)
        try:
            sh_core = doc_to_core_stats_header(sh_saved)
        except Exception as e:
            log_info("Failed to convert StatsHeaderDocument to StatsHeader")
            handle_create_schema_object_error(e)
        return sh_core

    def get_stats_headers_by_team_id(self, team_id: str) -> List[StatsHeader]:
        try:
            # pylint: disable=no-member
            sh_docs = StatsHeaderDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get stats_headers by team_id from database")
            handle_get_document_error(e)
        try:
            sh_cores = [doc_to_core_stats_header(sh) for sh in sh_docs]
        except Exception as e:
            log_info("Failed to convert StatsHeaderDocuments to StatsHeaders")
            handle_create_schema_object_error(e)
        return sh_cores

    def get_stats_headers_by_team_unit_shifts(
        self,
        team_id: str,
        stats_unit: StatsUnitOptions,
        header_unit: HeaderUnitOptions,
    ) -> List[StatsHeader]:
        try:
            # pylint: disable=no-member
            stats_headers = StatsHeaderDocument.objects.filter(  # type: ignore
                team=team_id,
                stats_unit=stats_unit.value,
                header_unit=header_unit.value,
                # selected_shifts=selected_shifts,
            )
        except Exception as e:
            log_info(
                "Failed to get stats_headers by team_id, stats_unit, "
                + "header_unit, selected_shifts from database"
            )
            handle_get_document_error(e)
        try:
            sh_cores = [doc_to_core_stats_header(sh) for sh in stats_headers]
        except Exception as e:
            log_info("Failed to convert StatsHeaderDocuments to StatsHeaders")
            handle_create_schema_object_error(e)
        return sh_cores

    def update_stats_header(self, stats_header: StatsHeader) -> StatsHeader:
        sh_doc = core_to_doc_stats_header(stats_header)
        try:
            # pylint: disable=no-member
            StatsHeaderDocument.objects.get(id=stats_header.id)  # type: ignore
        except Exception as e:
            log_info(f"StatsHeader with id {sh_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            sh_saved = sh_doc.save()
        except Exception as e:
            log_info("Failed to update stats_header to database")
            handle_save_document_error(e)
        try:
            sh_core = doc_to_core_stats_header(sh_saved)
        except Exception as e:
            log_info("Failed to convert StatsHeaderDocument to StatsHeader")
            handle_create_schema_object_error(e)
        return sh_core

    def delete_stats_header(self, stats_header_id: str) -> None:
        try:
            # pylint: disable=no-member
            stats_header = StatsHeaderDocument.objects.get(  # type: ignore
                id=stats_header_id
            )
        except Exception as e:
            log_info("Failed to get stats_header by id to delete from database")
            handle_get_document_error(e)
        try:
            stats_header.delete()
        except Exception as e:
            log_info("Failed to delete stats_header from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_stats_header(
    dataclass_obj: StatsHeader,
) -> StatsHeaderDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return StatsHeaderDocument(
        id=dataclass_obj.id,
        team=team,
        stats_unit=dataclass_obj.stats_unit.value,
        header_unit=dataclass_obj.header_unit.value,
        value=dataclass_obj.value,
        selected_shifts=[
            core_to_doc_shift_worker_option(ss) for ss in dataclass_obj.selected_shifts
        ],
    )


# document to core
def doc_to_core_stats_header(doc_obj: StatsHeaderDocument) -> StatsHeader:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["stats_unit"] = StatsUnitOptions(doc_dict["stats_unit"])
    doc_dict["header_unit"] = HeaderUnitOptions(doc_dict["header_unit"])
    doc_dict["selected_shifts"] = [
        doc_to_core_shift_worker_option(ss) for ss in doc_obj.selected_shifts
    ]
    doc_dict["is_favorite"] = True
    doc_dict.pop("_id")
    doc_dict.pop("team")
    return StatsHeader(**doc_dict)
