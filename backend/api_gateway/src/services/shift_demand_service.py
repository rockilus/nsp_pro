from datetime import datetime, timezone

from shared.schemas import ShiftDemand

from src.services.base_service import BaseService


class ShiftDemandService(BaseService):
    def update_shift_demand(self, shift_demand_new: ShiftDemand) -> ShiftDemand:
        shift_demand_new.last_modified = datetime.now(timezone.utc)
        return self.collection.shift_demand_db.update_shift_demand(shift_demand_new)

    def delete_shift_demand(self, shift_demand_id: str) -> None:
        # fmt: off
        self.collection.daily_shift_demand_db\
            .delete_daily_shift_demands_by_shift_demand_id(
                shift_demand_id
            )
        # fmt: on
        self.collection.shift_demand_db.delete_shift_demand(shift_demand_id)
