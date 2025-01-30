from shared.schemas import CoverageSelector

from scripts.setup_database import coverage_selector_db, schedule_db


def update_coverage_selector(
    coverage_selector: CoverageSelector,
) -> CoverageSelector:
    cs_existing = coverage_selector_db.get_coverage_selector_by_id(coverage_selector.id)
    if not cs_existing:
        raise ValueError("Coverage selector not found")
    if cs_existing.full_period is False and coverage_selector.full_period is True:
        schedule = schedule_db.get_schedule_by_id(cs_existing.schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        coverage_selector.start_date = schedule.start_date
        coverage_selector.end_date = schedule.end_date
    cs_updated = coverage_selector_db.update_coverage_selector(coverage_selector)
    return cs_updated
