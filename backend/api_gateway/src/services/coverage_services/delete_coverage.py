from scripts.setup_database import coverage_db, coverage_selector_db, shift_demand_db


def delete_coverage(coverage_id: str) -> None:
    shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
    coverage_selector_db.delete_coverage_selectors_by_coverage_id(coverage_id)
    coverage_db.delete_coverage(coverage_id)
