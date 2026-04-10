from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import Breach, Schedule


def save_breaches(
    schedule: Schedule,
    breaches: list[Breach],
    collections: DatabaseCollections,
) -> list[Breach]:
    collections.breach_db.delete_breaches_by_schedule_id(schedule.id)
    if not breaches:
        return []
    out = collections.breach_db.create_breaches(breaches)
    return out
