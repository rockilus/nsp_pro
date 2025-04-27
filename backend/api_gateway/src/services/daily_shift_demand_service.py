from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from shared.schemas.core import (
    CoverageSelector,
    DailyShiftDemand,
    DSDSourceType,
    Schedule,
    ShiftDemand,
)

from src.services.base_service import BaseService


class DailyShiftDemandService(BaseService):
    def generate_daily_shift_demands_for_schedule(
        self,
        schedule: Schedule,
        coverage_selectors: list[CoverageSelector],
        shift_demands: list[ShiftDemand],
    ) -> tuple[list[DailyShiftDemand], dict]:
        update_info = {
            "schedule": False,
            "coverage_selectors": set(),
            "shift_demands": set(),
        }
        if (
            schedule.last_updated_dsds is None
            or schedule.last_modified_dates > schedule.last_updated_dsds
        ):
            update_info["schedule"] = True
            return (
                self.generate_daily_shift_demands(
                    schedule=schedule,
                    coverage_selectors=coverage_selectors,
                    shift_demands=shift_demands,
                    shift_demand_ids=None,
                ),
                update_info,
            )

        daily_shift_demands = []

        for selector in coverage_selectors:
            if selector.last_modified > schedule.last_updated_dsds:
                daily_shift_demands.extend(
                    self.generate_daily_shift_demands(
                        schedule=schedule,
                        coverage_selectors=[selector],
                        shift_demands=shift_demands,
                        shift_demand_ids=None,
                    )
                )
                update_info["coverage_selectors"].add(selector.id)  # type: ignore
            else:
                modified_shift_demand_ids = [
                    demand.id
                    for demand in shift_demands
                    if demand.last_modified > schedule.last_updated_dsds
                    and demand.coverage_id == selector.coverage_id
                ]
                if modified_shift_demand_ids:
                    daily_shift_demands.extend(
                        self.generate_daily_shift_demands(
                            schedule=schedule,
                            coverage_selectors=[selector],
                            shift_demands=shift_demands,
                            shift_demand_ids=modified_shift_demand_ids,
                        )
                    )
                    update_info["shift_demands"].update(  # type: ignore
                        (selector.id, demand.id)
                        for demand in shift_demands
                        if demand.id in modified_shift_demand_ids
                    )
        return daily_shift_demands, update_info

    def generate_daily_shift_demands(
        self,
        schedule: Schedule,
        coverage_selectors: list[CoverageSelector],
        shift_demands: list[ShiftDemand],
        shift_demand_ids: Optional[list[str]] = None,
    ) -> list[DailyShiftDemand]:
        daily_shift_demands = []

        for selector in coverage_selectors:
            current_date = selector.start_date
            while current_date <= selector.end_date:
                if schedule.start_date <= current_date <= schedule.end_date:
                    day_index = current_date.weekday()
                    for demand in shift_demands:
                        if (
                            demand.coverage_id == selector.coverage_id
                            and demand.day_index == day_index
                            and (
                                shift_demand_ids is None
                                or demand.id in shift_demand_ids
                            )
                        ):
                            daily_shift_demand = DailyShiftDemand(
                                id=f"{demand.id}_{current_date}",
                                team_id=schedule.team_id,
                                schedule_id=schedule.id,
                                shift_demand_id=demand.id,
                                coverage_selector_id=selector.id,
                                source_type=DSDSourceType.SHIFT_DEMAND,
                                date=current_date,
                                shift_id=demand.shift_id,
                                count=1,
                            )
                            daily_shift_demands.append(daily_shift_demand)
                current_date += timedelta(days=1)

        return daily_shift_demands

    def get_daily_shift_demands(self, team_id: str) -> List[DailyShiftDemand]:
        # Get data from database
        schedule_campaign = self.collection.schedule_db.get_schedule_campaign(
            team_id
        )
        if schedule_campaign:
            shifts_work_not_deleted = (
                self.collection.shift_db.get_work_shifts_not_deleted(team_id)
            )
            shift_work_not_deleted_ids = [
                s.id for s in shifts_work_not_deleted
            ]
            coverage_selectors = (
                self.collection.coverage_selector_db.get_coverage_selectors(
                    schedule_campaign.id
                )
            )
            coverage_ids = list(
                set(c.coverage_id for c in coverage_selectors if c.coverage_id)
            )
            shift_demands = self.collection.shift_demand_db.get_shift_demands_by_coverage_ids(
                coverage_ids
            )
            shift_demands_shift_not_deleted = [
                sd
                for sd in shift_demands
                if sd.shift_id in shift_work_not_deleted_ids
            ]
            dsds_new, update_info = (
                self.generate_daily_shift_demands_for_schedule(
                    schedule_campaign,
                    coverage_selectors,
                    shift_demands_shift_not_deleted,
                )
            )

            if update_info.get("schedule", None):
                # fmt: off
                self.collection.daily_shift_demand_db\
                    .delete_dsds_by_schedule_id_and_source_shift_demand(
                        schedule_campaign.id
                    )
                # fmt: on
            else:
                cs_ids = list(update_info.get("coverage_selectors", []))
                if cs_ids:
                    # fmt: off
                    self.collection.daily_shift_demand_db\
                            .delete_dsds_by_schedule_id_and_cs_ids(
                                schedule_campaign.id, cs_ids
                            )
                cs_sd_pairs = list(update_info.get("shift_demands", []))
                if cs_sd_pairs:
                    # fmt: off
                    self.collection.daily_shift_demand_db\
                            .delete_dsds_by_schedule_id_and_cs_sd_pairs(
                                schedule_campaign.id, cs_sd_pairs
                            )
                    # fmt: on
            self.collection.daily_shift_demand_db.create_daily_shift_demands(
                dsds_new
            )
            schedule_campaign.last_updated_dsds = datetime.now(timezone.utc)
            self.collection.schedule_db.update_schedule(schedule_campaign)
        # Get daily shift demands
        dsds = self.collection.daily_shift_demand_db.get_daily_shift_demands(
            team_id
        )
        dsds, dsds_updated = self.remove_net_negative_daily_shift_demands(dsds)
        if dsds_updated:
            self.collection.daily_shift_demand_db.update_daily_shift_demands(
                dsds_updated
            )
        return dsds

    def remove_net_negative_daily_shift_demands(
        self,
        daily_shift_demands: List[DailyShiftDemand],
    ) -> Tuple[List[DailyShiftDemand], List[DailyShiftDemand]]:
        # Group demands by (shift_id, date)
        grouped_demands = defaultdict(list)
        for demand in daily_shift_demands:
            grouped_demands[(demand.shift_id, demand.date)].append(demand)

        # Process each group
        demands_updated: List[DailyShiftDemand] = []
        for demands in grouped_demands.values():
            total_count = sum(d.count for d in demands)
            for demand in demands:
                if (
                    demand.source_type == DSDSourceType.DIRECT_REQUIREMENT
                    and demand.count < 0
                    and total_count < 0
                ):
                    demand.count = 0
                    demands_updated.append(demand)

        return daily_shift_demands, demands_updated

    def delete_daily_shift_demands(self, demand_ids: List[str]) -> None:
        # Delete daily shift demands by shift demand ids
        self.collection.daily_shift_demand_db.delete_daily_shift_demands(
            demand_ids
        )
