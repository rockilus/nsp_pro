from scripts.setup_database import coverage_selector_db, daily_shift_demand_db


def delete_coverage_selector(coverage_selector_id: str) -> None:
    daily_shift_demand_db.delete_daily_shift_demands_by_coverage_selector_id(
        coverage_selector_id
    )
    coverage_selector_db.delete_coverage_selector(coverage_selector_id)
