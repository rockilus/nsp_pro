from src.scripts.setup_database import (
    coverage_db,
    coverage_selector_db,
    daily_shift_demand_db,
    shift_demand_db,
)


def delete_coverage(coverage_id: str) -> None:
    shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
    cs_coverage = coverage_selector_db.get_coverage_selectors_by_coverage_id(
        coverage_id
    )
    daily_shift_demand_db.delete_daily_shift_demands_by_coverage_selector_ids(
        [cs.id for cs in cs_coverage]
    )
    coverage_selector_db.delete_coverage_selectors_by_coverage_id(coverage_id)
    coverage_db.delete_coverage(coverage_id)
