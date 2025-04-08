from typing import List

from pymongo import UpdateOne

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.daily_shift_demand import DailyShiftDemandSchema
from shared.schemas.schemas.daily_shift_demand import (
    DailyShiftDemand,
    DSDSourceType,
)


class DailyShiftDemandRepository(BaseRepository[DailyShiftDemandSchema]):
    """Repository for daily shift demand documents using PyMongo."""

    def __init__(self):
        super().__init__("daily_shift_demands", DailyShiftDemandSchema)

    def create_daily_shift_demand(
        self, daily_shift_demand: DailyShiftDemand
    ) -> DailyShiftDemand:
        """Create a new daily shift demand."""
        dsd_schema = DailyShiftDemandSchema.from_core(daily_shift_demand)
        result = self.create(dsd_schema)
        return result.to_core()

    def create_daily_shift_demands(
        self, daily_shift_demands: List[DailyShiftDemand]
    ) -> List[DailyShiftDemand]:
        """Create multiple daily shift demands at once."""
        if not daily_shift_demands:
            return []

        dsd_schemas = [
            DailyShiftDemandSchema.from_core(daily_shift_demand)
            for daily_shift_demand in daily_shift_demands
        ]
        result = self.create_many(dsd_schemas)
        return [dsd.to_core() for dsd in result]

    def get_daily_shift_demands(self, team_id: str) -> List[DailyShiftDemand]:
        """Get all daily shift demands for a team."""
        dsds = self.find_all({"team": team_id})
        return [dsd.to_core() for dsd in dsds]

    def get_daily_shift_demand_by_id(
        self, daily_shift_demand_id: str
    ) -> DailyShiftDemand:
        """Get a daily shift demand by its ID."""
        dsd = self.find_by_id(daily_shift_demand_id)
        if not dsd:
            raise Exception(
                f"Daily shift demand with id {daily_shift_demand_id} not found"
            )
        return dsd.to_core()

    def get_daily_shift_demands_by_schedule_id(
        self, schedule_id: str
    ) -> List[DailyShiftDemand]:
        """Get all daily shift demands for a schedule."""
        dsds = self.find_all({"schedule": schedule_id})
        return [dsd.to_core() for dsd in dsds]

    def get_daily_shift_demands_direct_requirement_by_schedule_id(
        self, schedule_id: str
    ) -> List[DailyShiftDemand]:
        """Get all modified daily shift demands for a schedule."""
        dsds = self.find_all(
            {
                "schedule": schedule_id,
                "source_type": DSDSourceType.DIRECT_REQUIREMENT.value,
            }
        )
        return [dsd.to_core() for dsd in dsds]

    def get_daily_shift_demands_by_shift_demand_id(
        self, shift_demand_id: List[str]
    ) -> List[DailyShiftDemand]:
        """Get all daily shift demands for a shift demand."""
        dsds = self.find_all({"shift_demand": {"$in": shift_demand_id}})
        return [dsd.to_core() for dsd in dsds]

    def update_daily_shift_demand(
        self, daily_shift_demand: DailyShiftDemand
    ) -> DailyShiftDemand:
        """Update a daily shift demand."""
        dsd_schema = DailyShiftDemandSchema.from_core(daily_shift_demand)
        dsd_updated = self.update(dsd_schema)
        assert dsd_updated is not None
        return dsd_updated.to_core()

    def update_daily_shift_demands(
        self, daily_shift_demands: List[DailyShiftDemand]
    ) -> List[DailyShiftDemand]:
        """Update multiple daily shift demands."""
        if not daily_shift_demands:
            return []

        bulk_operations = []
        for dsd in daily_shift_demands:
            dsd_schema = DailyShiftDemandSchema.from_core(dsd)
            update_data = dsd_schema.to_mongo()
            update_data.pop("_id", None)
            bulk_operations.append(
                UpdateOne(
                    {"_id": dsd_schema.id},
                    {"$set": update_data},
                    upsert=False,
                )
            )

        result = self.collection.bulk_write(bulk_operations)

        if not result.acknowledged:
            raise Exception("Failed to update documents")

        updated_ids = [dsd.id for dsd in daily_shift_demands]
        updated_docs = self.find_all({"_id": {"$in": updated_ids}})
        return [doc.to_core() for doc in updated_docs]

    def delete_daily_shift_demand(self, daily_shift_demand_id: str) -> None:
        """Delete a daily shift demand by its ID."""
        result = self.delete(daily_shift_demand_id)
        if result is False:
            raise Exception(
                f"Daily shift demand with id {daily_shift_demand_id} not found "
                + "or already deleted"
            )

    def delete_daily_shift_demands_by_schedule_id(self, schedule_id: str) -> None:
        """Delete all daily shift demands for a schedule."""
        self.collection.delete_many({"schedule": schedule_id})

    def delete_dsds_by_schedule_id_and_source_shift_demand(
        self, schedule_id: str
    ) -> None:
        """
        Delete all daily shift demands for a schedule and source type shift
        demand.
        """
        self.collection.delete_many(
            {
                "schedule": schedule_id,
                "source_type": DSDSourceType.SHIFT_DEMAND.value,
            }
        )

    def delete_daily_shift_demands_by_shift_id(self, shift_id: str) -> None:
        """Delete all daily shift demands for a shift."""
        self.collection.delete_many({"shift": shift_id})

    def delete_dsds_by_schedule_id_and_cs_ids(
        self, schedule_id: str, coverage_selector_ids: List[str]
    ) -> None:
        """Delete all daily shift demands for a schedule and a list of coverage
        selectors with source type ShiftDemand."""
        self.collection.delete_many(
            {
                "schedule": schedule_id,
                "coverage_selector": {"$in": coverage_selector_ids},
                "source_type": DSDSourceType.SHIFT_DEMAND.value,
            }
        )

    def delete_dsds_by_schedule_id_and_cs_sd_pairs(
        self,
        schedule_id: str,
        cs_sd_pairs: List[tuple],
    ) -> None:
        """
        Delete all daily shift demands for a schedule and pairs of coverage
        selector and shift demand with source type ShiftDemand.
        """
        conditions = [
            {
                "coverage_selector": coverage_selector_id,
                "shift_demand": shift_demand_id,
            }
            for coverage_selector_id, shift_demand_id in cs_sd_pairs
        ]
        self.collection.delete_many(
            {
                "schedule": schedule_id,
                "source_type": DSDSourceType.SHIFT_DEMAND.value,
                "$or": conditions,
            }
        )

    def delete_daily_shift_demands_by_coverage_selector_ids(
        self, coverage_selector_ids: List[str]
    ) -> None:
        """Delete all daily shift demands for a list of coverage selectors."""
        self.collection.delete_many(
            {"coverage_selector": {"$in": coverage_selector_ids}}
        )

    def delete_daily_shift_demands_by_shift_demand_id(
        self, shift_demand_id: str
    ) -> None:
        """Delete all daily shift demands for a shift demand ID."""
        self.collection.delete_many({"shift_demand": shift_demand_id})
