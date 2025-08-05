from typing import Dict, List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import (
    BaseRepository,
)
from shared.database.schemas.shift_demand import (
    ShiftDemandSchema,
)
from shared.schemas.core.shift_demand import (
    ShiftDemand,
)


class ShiftDemandRepository(BaseRepository[ShiftDemandSchema]):
    """Repository for shift demand documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "shift_demands", ShiftDemandSchema)

    def create_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        """Create a new shift demand."""
        shift_demand_schema = ShiftDemandSchema.from_core(shift_demand)
        result = self.create(shift_demand_schema)
        return result.to_core()

    def create_shift_demands(
        self, shift_demands: List[ShiftDemand]
    ) -> List[ShiftDemand]:
        """Create multiple shift demands at once."""
        if not shift_demands:
            return []

        shift_demand_schemas = [ShiftDemandSchema.from_core(sd) for sd in shift_demands]
        result = self.create_many(shift_demand_schemas)
        return [sd.to_core() for sd in result]

    def get_shift_demand_by_id(self, shift_demand_id: str) -> ShiftDemand:
        """Get a shift demand by its ID."""
        shift_demand = self.find_by_id(shift_demand_id)
        if not shift_demand:
            raise Exception(f"Shift demand with id {shift_demand_id} not found")
        return shift_demand.to_core()

    def get_shift_demands_by_coverage_ids(
        self, coverage_ids: List[str]
    ) -> List[ShiftDemand]:
        """Get shift demands by coverage IDs."""
        shift_demands = self.find_all({"coverage": {"$in": coverage_ids}})
        return [sd.to_core() for sd in shift_demands]

    def get_cov_id_to_shift_demands_by_coverage_ids(
        self, coverage_ids: List[str]
    ) -> Dict[str, List[ShiftDemand]]:
        """Get a mapping of coverage IDs to shift demands."""
        shift_demands = self.find_all({"coverage": {"$in": coverage_ids}})
        out: Dict[str, List[ShiftDemand]] = {c_id: [] for c_id in coverage_ids}
        for sd in shift_demands:
            core_sd = sd.to_core()
            coverage_id = core_sd.coverage_id
            if coverage_id not in out:
                out[coverage_id] = []
            out[coverage_id].append(core_sd)
        return out

    def update_shift_demand(self, shift_demand: ShiftDemand) -> ShiftDemand:
        """Update a shift demand."""
        shift_demand_schema = ShiftDemandSchema.from_core(shift_demand)
        shift_demand_updated = self.update(shift_demand_schema)
        assert shift_demand_updated is not None
        return shift_demand_updated.to_core()

    def delete_shift_demand(self, shift_demand_id: str) -> None:
        """Delete a shift demand by its ID."""
        result = self.delete(shift_demand_id)
        if result is False:
            raise Exception(
                f"Shift demand with id {shift_demand_id} not found or already deleted"
            )

    def delete_shift_demands_by_coverage_id(self, coverage_id: str) -> List[str]:
        """Delete shift demands by coverage ID and return their IDs."""
        shift_demands = self.find_all({"coverage": coverage_id})
        shift_demand_ids = [sd.id for sd in shift_demands if sd.id is not None]
        self.collection.delete_many({"coverage": coverage_id})
        return shift_demand_ids

    def delete_shift_demands_by_shift_id(self, shift_id: str) -> None:
        """Delete shift demands by shift ID."""
        self.collection.delete_many({"shift": shift_id})
