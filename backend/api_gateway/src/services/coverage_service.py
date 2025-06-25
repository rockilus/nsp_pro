from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods
class CoverageService(BaseService):
    def delete_coverage(self, coverage_id: str) -> None:
        sd_deleted_ids = (
            self.collection.shift_demand_db.delete_shift_demands_by_coverage_id(
                coverage_id
            )
        )
        # fmt: off
        self.collection.shift_demand_exclusion_db\
            .delete_shift_demand_exclusions_by_shift_demand_ids(
                shift_demand_ids=sd_deleted_ids
            )
        # fmt: on
        self.collection.coverage_selector_db.delete_coverage_selectors_by_coverage_id(
            coverage_id
        )
        self.collection.coverage_db.delete_coverage(coverage_id)
