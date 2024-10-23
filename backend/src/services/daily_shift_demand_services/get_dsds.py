from typing import List

from core import DailyShiftDemand
from scripts.setup_database import (
    coverage_selector_db,
    daily_shift_demand_db,
    schedule_db,
    shift_db,
    shift_demand_db,
)
from services.daily_shift_demand_services.build_dsds import build_daily_shift_demands


def get_daily_shift_demands(
    team_id: str,
) -> List[DailyShiftDemand]:
    # Get data from database
    schedule = schedule_db.get_schedule_wip(team_id)
    shifts_work_not_deleted = shift_db.get_work_shifts_not_deleted(team_id)
    coverage_selectors = coverage_selector_db.get_coverage_selectors(schedule.id)
    shift_demands = shift_demand_db.get_shift_demands_by_coverage_selectors(
        coverage_selectors
    )
    dsds_sd_modify = (
        daily_shift_demand_db.get_daily_shift_demands_modified_by_schedule_id(
            schedule.id
        )
    )

    # Update daily shift demands from shift demands for wip schedule
    daily_shift_demand_db.delete_dsds_by_schedule_id_and_source_shift_demand(
        schedule.id
    )
    new_dsds = build_daily_shift_demands(
        schedule,
        coverage_selectors,
        shift_demands,
        shifts_work_not_deleted,
        dsds_sd_modify,
    )
    daily_shift_demand_db.create_daily_shift_demands(new_dsds)

    # Get daily shift demands
    dsds = daily_shift_demand_db.get_daily_shift_demands(team_id)
    return dsds
