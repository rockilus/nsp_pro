from datetime import datetime

from bson import ObjectId

from core.schedule import StatsOptions
from database.db import DB
from models import StatsOptions as StatsOptionsDocument
from models import Team as TeamDocument


class StatsOptionsDB:
    def __init__(self, db: DB):
        self.db = db

    def create_stats_options(self, stats_options: StatsOptions) -> StatsOptions:
        so_data = to_mongo_stats_options(stats_options)
        so_doc = StatsOptionsDocument(
            id=str(ObjectId()),
            team=so_data.team,
            start_date=so_data.start_date,
            end_date=so_data.end_date,
        )
        so_saved = so_doc.save()
        return _from_mongo_stats_options(so_saved)

    def get_stats_options(self, team_id: str) -> StatsOptions | None:
        # pylint: disable=no-member
        stats_options = StatsOptionsDocument.objects(  # type: ignore
            team=team_id
        ).first()
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
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    # pylint: disable=R0801
    return StatsOptionsDocument(
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


def _from_mongo_stats_options(doc_obj: StatsOptionsDocument) -> StatsOptions:
    return StatsOptions(
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        start_date=doc_obj.start_date.date(),
        end_date=doc_obj.end_date.date(),
    )
