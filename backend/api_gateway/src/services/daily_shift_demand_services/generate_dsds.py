from datetime import timedelta
from typing import Optional

from shared.schemas import (
    CoverageSelector,
    DailyShiftDemand,
    DSDSourceType,
    Schedule,
    ShiftDemand,
)


def generate_daily_shift_demands_for_schedule(
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
            generate_daily_shift_demands(
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
                generate_daily_shift_demands(
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
                    generate_daily_shift_demands(
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
                        and (shift_demand_ids is None or demand.id in shift_demand_ids)
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
