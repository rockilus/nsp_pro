from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods
class CoverageService(BaseService):
    def delete_coverage(self, coverage_id: str) -> None:
        self.collection.shift_demand_db.delete_shift_demands_by_coverage_id(coverage_id)
        cs_coverage = (
            self.collection.coverage_selector_db.get_coverage_selectors_by_coverage_id(
                coverage_id
            )
        )
        # fmt: off
        self.collection.daily_shift_demand_db\
            .delete_daily_shift_demands_by_coverage_selector_ids(
                [cs.id for cs in cs_coverage]
            )
        # fmt: on
        self.collection.coverage_selector_db.delete_coverage_selectors_by_coverage_id(
            coverage_id
        )
        self.collection.coverage_db.delete_coverage(coverage_id)
