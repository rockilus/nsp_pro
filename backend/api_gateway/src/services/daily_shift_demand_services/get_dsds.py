from datetime import datetime, timezone
from typing import List

from shared.schemas import DailyShiftDemand

from src.scripts.setup_database import (
    coverage_selector_db,
    daily_shift_demand_db,
    schedule_db,
    shift_db,
    shift_demand_db,
)
from src.services.daily_shift_demand_services.generate_dsds import (
    generate_daily_shift_demands_for_schedule,
)
from src.services.daily_shift_demand_services.update_dsds import (
    remove_net_negative_daily_shift_demands,
)


def get_daily_shift_demands(
    team_id: str,
) -> List[DailyShiftDemand]:
    # Get data from database
    schedule_campaign = schedule_db.get_schedule_campaign(team_id)
    if schedule_campaign:
        shifts_work_not_deleted = shift_db.get_work_shifts_not_deleted(team_id)
        shift_work_not_deleted_ids = [s.id for s in shifts_work_not_deleted]
        coverage_selectors = coverage_selector_db.get_coverage_selectors(
            schedule_campaign.id
        )
        coverage_ids = list(
            set(c.coverage_id for c in coverage_selectors if c.coverage_id)
        )
        shift_demands = shift_demand_db.get_shift_demands_by_coverage_ids(coverage_ids)
        shift_demands_shift_not_deleted = [
            sd for sd in shift_demands if sd.shift_id in shift_work_not_deleted_ids
        ]
        dsds_new, update_info = generate_daily_shift_demands_for_schedule(
            schedule_campaign,
            coverage_selectors,
            shift_demands_shift_not_deleted,
        )

        if update_info.get("schedule", None):
            daily_shift_demand_db.delete_dsds_by_schedule_id_and_source_shift_demand(
                schedule_campaign.id
            )
        else:
            cs_ids = list(update_info.get("coverage_selectors", []))
            if cs_ids:
                daily_shift_demand_db.delete_dsds_by_schedule_id_and_cs_ids(
                    schedule_campaign.id, cs_ids
                )
            cs_sd_pairs = list(update_info.get("shift_demands", []))
            if cs_sd_pairs:
                daily_shift_demand_db.delete_dsds_by_schedule_id_and_cs_sd_pairs(
                    schedule_campaign.id, cs_sd_pairs
                )
        daily_shift_demand_db.create_daily_shift_demands(dsds_new)
        schedule_campaign.last_updated_dsds = datetime.now(timezone.utc)
        schedule_db.update_schedule(schedule_campaign)
    # Get daily shift demands
    dsds = daily_shift_demand_db.get_daily_shift_demands(team_id)
    dsds, dsds_updated = remove_net_negative_daily_shift_demands(dsds)
    if dsds_updated:
        daily_shift_demand_db.update_daily_shift_demands(dsds_updated)
    return dsds
