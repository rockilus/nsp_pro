from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from shared.schemas.core import (
    CoverageSelector,
    DailyShiftDemand,
    DemandsResult,
    DSDSourceType,
    DuplicateRequest,
    Schedule,
    ShiftDemand,
    ShiftDemandExclusion,
)

from src.services.base_service import BaseService
from src.utils.duplicate_utils import (
    build_duplicate_date_mapping,
    validate_duplicate_lists,
)


class DailyShiftDemandService(BaseService):
    def generate_daily_shift_demands_for_schedule(
        self,
        schedule: Schedule,
        coverage_selectors: list[CoverageSelector],
        shift_demands: list[ShiftDemand],
        sd_exclusions: List[ShiftDemandExclusion],
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
                    sd_exclusions=sd_exclusions,
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
                        sd_exclusions=sd_exclusions,
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
                            sd_exclusions=sd_exclusions,
                            shift_demand_ids=modified_shift_demand_ids,
                        )
                    )
                    update_info["shift_demands"].update(  # type: ignore
                        (selector.id, demand.id)
                        for demand in shift_demands
                        if demand.id in modified_shift_demand_ids
                    )
        return daily_shift_demands, update_info

    # pylint: disable=too-many-arguments
    def generate_daily_shift_demands(
        self,
        schedule: Schedule,
        coverage_selectors: list[CoverageSelector],
        shift_demands: list[ShiftDemand],
        sd_exclusions: List[ShiftDemandExclusion],
        shift_demand_ids: Optional[list[str]] = None,
    ) -> list[DailyShiftDemand]:
        daily_shift_demands = []

        sd_excl_map = {
            (excl.shift_demand_id, excl.date): excl for excl in sd_exclusions
        }

        # pylint: disable=too-many-nested-blocks
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
                            if (demand.id, current_date) in sd_excl_map:
                                continue
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

    # pylint: disable=too-many-locals
    def get_daily_shift_demands(self, team_id: str) -> List[DailyShiftDemand]:
        # Get data from database
        schedule_campaign = self.collection.schedule_db.get_schedule_campaign(team_id)
        if schedule_campaign:
            shifts_work_not_deleted = (
                self.collection.shift_db.get_work_shifts_not_deleted(team_id)
            )
            shift_work_not_deleted_ids = [s.id for s in shifts_work_not_deleted]
            coverage_selectors = (
                self.collection.coverage_selector_db.get_coverage_selectors(
                    schedule_campaign.id
                )
            )
            coverage_ids = list(
                set(c.coverage_id for c in coverage_selectors if c.coverage_id)
            )
            shift_demands = (
                self.collection.shift_demand_db.get_shift_demands_by_coverage_ids(
                    coverage_ids
                )
            )
            # fmt: off
            sd_exclusions = self.collection.shift_demand_exclusion_db\
                .get_shift_demand_exclusions_by_schedule_id(
                    schedule_id=schedule_campaign.id
                )
            # fmt: on
            shift_demands_shift_not_deleted = [
                sd for sd in shift_demands if sd.shift_id in shift_work_not_deleted_ids
            ]
            dsds_new, update_info = self.generate_daily_shift_demands_for_schedule(
                schedule_campaign,
                coverage_selectors,
                shift_demands_shift_not_deleted,
                sd_exclusions,
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
            self.collection.daily_shift_demand_db.create_daily_shift_demands(dsds_new)
            schedule_campaign.last_updated_dsds = datetime.now(timezone.utc)
            self.collection.schedule_db.update_schedule(schedule_campaign)
        # Get daily shift demands
        dsds = self.collection.daily_shift_demand_db.get_daily_shift_demands(team_id)
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

    def delete_daily_shift_demands(
        self, team_id: str, shift_id: str, target_date: date
    ) -> List[str]:
        # fmt: off
        dsds_shift_demand = self.collection.daily_shift_demand_db\
            .get_daily_shift_demands_by_team_shift_date(
                team_id=team_id, shift_id=shift_id, target_date=target_date
            )
        # fmt: on
        sd_exclusions = [
            ShiftDemandExclusion(
                id="",
                schedule_id=dsd.schedule_id,
                coverage_selector_id=dsd.coverage_selector_id,
                shift_demand_id=dsd.shift_demand_id,
                date=dsd.date,
            )
            for dsd in dsds_shift_demand
            if dsd.coverage_selector_id is not None and dsd.shift_demand_id is not None
        ]
        if sd_exclusions:
            self.collection.shift_demand_exclusion_db.create_shift_demand_exclusions(
                sd_exclusions
            )
        # fmt: off
        dsd_deleted_ids = self.collection.daily_shift_demand_db\
            .delete_daily_shift_demands_by_team_shift_date(
                team_id=team_id, shift_id=shift_id, target_date=target_date
            )
        # fmt: on
        return dsd_deleted_ids

    def duplicate_period(
        self, campaign: Schedule, duplicate: DuplicateRequest
    ) -> DemandsResult:
        date_mapping = build_duplicate_date_mapping(duplicate=duplicate)
        source_period = list(date_mapping.keys())
        target_period = list(date_mapping.values())

        demands_source, demands_target = self._get_demands_for_periods(
            source_period=source_period,
            target_period=target_period,
            team_id=campaign.team_id,
        )
        (
            source_duplicate_ids,
            target_keep_ids,
            target_delete_ids,
            exclusions_target_create,
        ) = self._build_demand_and_exclusion_lists(
            source_period=source_period,
            target_period=target_period,
            date_mapping=date_mapping,
            demands_source=demands_source,
            demands_target=demands_target,
        )

        validate_duplicate_lists(
            source_ids=[d.id for d in demands_source],
            target_ids=[d.id for d in demands_target],
            source_duplicate_ids=source_duplicate_ids,
            target_keep_ids=target_keep_ids,
            target_delete_ids=target_delete_ids,
        )

        d_to_create = self._build_duplicate_demands(
            demands_source=demands_source,
            date_mapping=date_mapping,
            source_duplicate_ids=source_duplicate_ids,
            campaign_id=campaign.id,
        )

        d_result = self._apply_changes_to_database(
            d_to_create=d_to_create,
            target_delete_ids=target_delete_ids,
            exclusions_target_create=exclusions_target_create,
        )

        return d_result

    def _get_demands_for_periods(
        self,
        source_period: List[date],
        target_period: List[date],
        team_id: str,
    ) -> Tuple[List[DailyShiftDemand], List[DailyShiftDemand]]:
        demands_source = (
            self.collection.daily_shift_demand_db.get_daily_shift_demands_by_dates(
                team_id=team_id,
                start_date=min(source_period),
                end_date=max(source_period),
            )
        )
        demands_target = (
            self.collection.daily_shift_demand_db.get_daily_shift_demands_by_dates(
                team_id=team_id,
                start_date=min(target_period),
                end_date=max(target_period),
            )
        )
        return demands_source, demands_target

    @staticmethod
    def _build_demand_and_exclusion_lists(
        source_period: List[date],
        target_period: List[date],
        date_mapping: Dict[date, date],
        demands_source: List[DailyShiftDemand],
        demands_target: List[DailyShiftDemand],
    ) -> Tuple[
        List[str],
        List[str],
        List[str],
        List[ShiftDemandExclusion],
    ]:
        source_duplicate_ids = []
        target_keep_ids = []
        target_delete_ids = []
        exclusions_target_create = []

        for d_source in demands_source:
            if d_source.date not in source_period:
                continue

            if d_source.source_type == DSDSourceType.SHIFT_DEMAND:
                matching_target_demand = next(
                    (
                        d
                        for d in demands_target
                        if d.date == date_mapping[d_source.date]
                        and d.shift_id == d_source.shift_id
                        and d.source_type == DSDSourceType.SHIFT_DEMAND
                        and d.shift_demand_id == d_source.shift_demand_id
                    ),
                    None,
                )
                if matching_target_demand:
                    target_keep_ids.append(matching_target_demand.id)
                    continue
            source_duplicate_ids.append(d_source.id)

        for d_target in demands_target:
            if d_target.date not in target_period:
                continue
            if d_target.id in target_keep_ids:
                continue

            if (
                d_target.source_type == DSDSourceType.SHIFT_DEMAND
                and d_target.coverage_selector_id is not None
                and d_target.shift_demand_id is not None
            ):
                exclusions_target_create.append(
                    ShiftDemandExclusion(
                        id="",
                        schedule_id=d_target.schedule_id,
                        coverage_selector_id=d_target.coverage_selector_id,
                        shift_demand_id=d_target.shift_demand_id,
                        date=d_target.date,
                    )
                )
            target_delete_ids.append(d_target.id)

        return (
            source_duplicate_ids,
            target_keep_ids,
            target_delete_ids,
            exclusions_target_create,
        )

    @staticmethod
    def _build_duplicate_demands(
        demands_source: List[DailyShiftDemand],
        date_mapping: Dict[date, date],
        source_duplicate_ids: List[str],
        campaign_id: str,
    ) -> List[DailyShiftDemand]:
        d_to_create = []

        for d_source in demands_source:
            if d_source.id not in source_duplicate_ids:
                continue
            d_to_create.append(
                DailyShiftDemand(
                    id="",
                    team_id=d_source.team_id,
                    schedule_id=campaign_id,
                    shift_demand_id=None,
                    coverage_selector_id=None,
                    source_type=DSDSourceType.DIRECT_REQUIREMENT,
                    date=date_mapping[d_source.date],
                    shift_id=d_source.shift_id,
                    count=d_source.count,
                )
            )

        return d_to_create

    def _apply_changes_to_database(
        self,
        d_to_create: List[DailyShiftDemand],
        target_delete_ids: List[str],
        exclusions_target_create: List[ShiftDemandExclusion],
    ) -> DemandsResult:
        d_created = self.collection.daily_shift_demand_db.create_daily_shift_demands(
            daily_shift_demands=d_to_create
        )
        d_deleted_ids = (
            self.collection.daily_shift_demand_db.delete_daily_shift_demands(
                daily_shift_demand_ids=target_delete_ids
            )
        )
        self.collection.shift_demand_exclusion_db.create_shift_demand_exclusions(
            exclusions=exclusions_target_create
        )
        return DemandsResult(
            demands_created=d_created,
            demands_read=[],
            demands_updated=[],
            demands_deleted_ids=d_deleted_ids,
        )
