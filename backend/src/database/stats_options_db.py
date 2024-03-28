from datetime import datetime

from bson import ObjectId

from core.schedule import StatsOptions
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import StatsOptions as StatsOptionsDocument
from models import Team as TeamDocument
from services.logging import log_info


class StatsOptionsDB:
    def __init__(self, db: DB):
        self.db = db

    def create_stats_options(self, stats_options: StatsOptions) -> StatsOptions:
        so_doc = core_to_doc_stats_options(stats_options)
        so_doc.id = str(ObjectId())
        try:
            so_saved = so_doc.save()
        except Exception as e:
            log_info(f"Failed to save stats options to database: {e}")
            handle_save_document_error(e)
        return _from_mongo_stats_options(so_saved)

    def get_stats_options(self, team_id: str) -> StatsOptions | None:
        try:
            # pylint: disable=no-member
            stats_options = StatsOptionsDocument.objects(  # type: ignore
                team=team_id
            ).first()
        except Exception as e:
            log_info(f"Failed to get stats options from database: {e}")
            handle_get_document_error(e)
        return _from_mongo_stats_options(stats_options) if stats_options else None

    def get_stats_options_by_id(self, stats_options_id: str) -> StatsOptions:
        try:
            # pylint: disable=no-member
            stats_options = StatsOptionsDocument.objects.get(  # type: ignore
                id=stats_options_id
            )
        except Exception as e:
            log_info(f"Failed to get stats options by id from database: {e}")
            handle_get_document_error(e)
        return _from_mongo_stats_options(stats_options)

    def update_stats_options(self, stats_options: StatsOptions) -> StatsOptions:
        document = core_to_doc_stats_options(stats_options)
        try:
            document_saved = document.save()
        except Exception as e:
            log_info(f"Failed to update stats options to database: {e}")
            handle_save_document_error(e)
        return _from_mongo_stats_options(document_saved)

    def delete_stats_options(self, stats_options_id: str) -> None:
        try:
            # pylint: disable=no-member
            stats_options = StatsOptionsDocument.objects.get(  # type: ignore
                id=stats_options_id
            )
        except Exception as e:
            log_info(f"Failed to get stats options by id to delete from database: {e}")
            handle_get_document_error(e)
        try:
            stats_options.delete()
        except Exception as e:
            log_info(f"Failed to delete stats options from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_stats_options(
    dataclass_obj: StatsOptions,
) -> StatsOptionsDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get team by id: {e}")
        handle_get_document_error(e)
    try:
        so_doc = StatsOptionsDocument(
            id=dataclass_obj.id,
            team=team,
            start_date=datetime(
                dataclass_obj.start_date.year,
                dataclass_obj.start_date.month,
                dataclass_obj.start_date.day,
            ),
            end_date=datetime(
                dataclass_obj.end_date.year,
                dataclass_obj.end_date.month,
                dataclass_obj.end_date.day,
            ),
        )
    except Exception as e:
        log_info(f"Failed to convert StatsOptions to StatsOptionsDocument: {e}")
        handle_create_document_error(e)
    return so_doc


# document to core
def _from_mongo_stats_options(doc_obj: StatsOptionsDocument) -> StatsOptions:
    try:
        stats_options = StatsOptions(
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            start_date=doc_obj.start_date.date(),
            end_date=doc_obj.end_date.date(),
        )
    except Exception as e:
        log_info(f"Failed to convert StatsOptionsDocument to StatsOptions: {e}")
        handle_create_core_object_error(e)
    return stats_options
