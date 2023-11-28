from datetime import datetime
from typing import Union

from bson import ObjectId

from core.schedule import StatsOptions
from database.db import DB
from models.stats_options import StatsOptions as StatsOptionsDocument


class StatsOptionsDB:
    def __init__(self, db: DB):
        self.db = db

    def create_stats_options(
        self,
        stats_options: StatsOptions,
    ) -> StatsOptions:
        stats_options_doc = StatsOptionsDocument(
            id=str(ObjectId()),
            start_date=datetime(
                stats_options.start_date.year,
                stats_options.start_date.month,
                stats_options.start_date.day,
            ),
            end_date=datetime(
                stats_options.end_date.year,
                stats_options.end_date.month,
                stats_options.end_date.day,
            ),
        )
        stats_options_saved = stats_options_doc.save()
        return _from_mongo_stats_options(stats_options_saved)

    def get_stats_options(self) -> Union[StatsOptions, None]:
        # pylint: disable=no-member
        stats_options = StatsOptionsDocument.objects.first()  # type: ignore
        return _from_mongo_stats_options(stats_options) if stats_options else None

    def get_stats_options_by_id(self, stats_options_id: str) -> StatsOptions:
        # pylint: disable=no-member
        stats_options = StatsOptionsDocument.objects.get(  # type: ignore
            id=stats_options_id
        )
        return _from_mongo_stats_options(stats_options)

    def update_stats_options(self, stats_options: StatsOptions) -> StatsOptions:
        document = to_mongo_stats_options(stats_options)
        document_saved = document.save()
        return _from_mongo_stats_options(document_saved)

    def delete_stats_options(self, stats_options_id: str) -> None:
        # pylint: disable=no-member
        stats_options = StatsOptionsDocument.objects.get(  # type: ignore
            id=stats_options_id
        )
        stats_options.delete()


# Mappers
def to_mongo_stats_options(
    dataclass_obj: StatsOptions,
) -> StatsOptionsDocument:
    # pylint: disable=R0801
    return StatsOptionsDocument(
        id=dataclass_obj.id,
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


def _from_mongo_stats_options(doc_obj: StatsOptionsDocument) -> StatsOptions:
    return StatsOptions(
        id=doc_obj.id,
        start_date=doc_obj.start_date.date(),
        end_date=doc_obj.end_date.date(),
    )
