from datetime import datetime, timezone

from shared.schemas.core import CoverageSelector

from src.services.base_service import BaseService


class CoverageSelectorService(BaseService):
    def update_coverage_selector(self, cs_new: CoverageSelector) -> CoverageSelector:
        cs_old = self.collection.coverage_selector_db.get_coverage_selector_by_id(
            cs_new.id
        )
        if not cs_old:
            raise ValueError("Coverage selector not found")
        if cs_old.full_period is False and cs_new.full_period is True:
            schedule = self.collection.schedule_db.get_schedule_by_id(
                cs_old.schedule_id
            )
            if not schedule:
                raise ValueError("Schedule not found")
            cs_new.start_date = schedule.start_date
            cs_new.end_date = schedule.end_date
        if cs_old.start_date != cs_new.start_date or cs_old.end_date != cs_new.end_date:
            cs_new.last_modified = datetime.now(timezone.utc)
        return self.collection.coverage_selector_db.update_coverage_selector(cs_new)

    def delete_coverage_selector(self, coverage_selector_id: str) -> None:
        # fmt: off
        self.collection.daily_shift_demand_db\
            .delete_daily_shift_demands_by_coverage_selector_ids(
                [coverage_selector_id]
            )
        self.collection.shift_demand_exclusion_db\
            .delete_shift_demand_exclusions_by_coverage_selector_id(
                coverage_selector_id=coverage_selector_id
            )
        # fmt: on
        self.collection.coverage_selector_db.delete_coverage_selector(
            coverage_selector_id
        )
