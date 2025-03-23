from datetime import datetime, timezone

from shared.schemas import ShiftDemand

from scripts.setup_database import shift_demand_db


def update_shift_demand(shift_demand_new: ShiftDemand) -> ShiftDemand:
    shift_demand_new.last_modified = datetime.now(timezone.utc)
    return shift_demand_db.update_shift_demand(shift_demand_new)
