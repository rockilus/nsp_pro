from collections import defaultdict
from typing import List, Tuple

from shared.schemas import DailyShiftDemand, DSDSourceType


def remove_net_negative_daily_shift_demands(
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
