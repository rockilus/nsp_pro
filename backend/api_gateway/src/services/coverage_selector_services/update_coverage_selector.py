from datetime import datetime, timezone

from scripts.setup_database import coverage_selector_db, schedule_db
from shared.schemas import CoverageSelector


def update_coverage_selector(
    cs_new: CoverageSelector,
) -> CoverageSelector:
    cs_old = coverage_selector_db.get_coverage_selector_by_id(cs_new.id)
    if not cs_old:
        raise ValueError("Coverage selector not found")
    if cs_old.full_period is False and cs_new.full_period is True:
        schedule = schedule_db.get_schedule_by_id(cs_old.schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        cs_new.start_date = schedule.start_date
        cs_new.end_date = schedule.end_date
    if (
        cs_old.start_date != cs_new.start_date
        or cs_old.end_date != cs_new.end_date
    ):
        cs_new.last_modified = datetime.now(timezone.utc)
    return coverage_selector_db.update_coverage_selector(cs_new)
