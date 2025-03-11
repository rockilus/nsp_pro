from typing import List

from shared.database import DatabaseCollections
from shared.schemas import Breach, Schedule


def save_breaches(
    schedule: Schedule,
    breaches: List[Breach],
    collections: DatabaseCollections,
) -> List[Breach]:
    collections.breach_db.delete_breaches_by_schedule_id(schedule.id)
    if not breaches:
        return []
    out = collections.breach_db.create_breaches(breaches)
    return out
