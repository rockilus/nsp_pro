from typing import Dict, List

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    DimensionType,
    ScheduleStatus,
    ShiftWorkerOption,
    Stats,
    StatsOptions,
    StatsTimeFrameOptions,
)

from src.errors import NoCampaignError
from src.services.base_service import BaseService
from src.utils.constraint_utils import build_options
from src.utils.stats_utils.build_dates import build_dates
from src.utils.stats_utils.build_stats import (
    build_stats_favorites,
    build_stats_for_stats_unit,
    build_work_shift_indexes,
)


class StatsService(BaseService):
    # pylint: disable=too-many-locals
    def build_stats(self, team_id: str, stats_options: StatsOptions) -> Stats:
        schedules = self.collection.schedule_db.get_schedules(team_id)
        schedule_campaign = next(
            (s for s in schedules if s.status == ScheduleStatus.CAMPAIGN), None
        )
        if (
            stats_options.time_frame == StatsTimeFrameOptions.CAMPAING
            and not schedule_campaign
        ):
            return Stats([], [])
        try:
            start_date, end_date, date_to_i = build_dates(
                stats_options.time_frame,
                stats_options.start_date,
                stats_options.end_date,
                schedules,
                schedule_campaign,
            )
        except NoCampaignError as e:
            raise e
        workers = self.collection.worker_db.get_workers_not_deleted(team_id)
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id)
        dimensions = self.collection.dimension_db.get_dimensions(team_id)
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
            [s.id for s in shifts]
        )
        shift_dim_dict = self.collection.attribute_db.get_shifts_id_by_dim_and_attr()
        assignments = self.collection.assignment_db.get_assignments_by_dates(
            team_id, start_date, end_date
        )
        if stats_options.show_favorites is True:
            stats_headers = (
                self.collection.stats_header_db.get_stats_headers_by_team_id(team_id)
            )
            return build_stats_favorites(
                team_id,
                workers,
                date_to_i,
                shifts,
                dimensions,
                dim_entries,
                attributes,
                shift_dim_dict,
                assignments,
                stats_headers,
            )
        stats_headers = (
            self.collection.stats_header_db.get_stats_headers_by_team_unit_shifts(
                team_id, stats_options.stats_unit, stats_options.header_unit
            )
        )
        # pylint: disable=R0801
        (
            worker_to_i,
            work_shift_to_i,
            rest_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            i_to_work_shift,
            i_to_rest_shift,
        ) = build_work_shift_indexes(
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            shift_dim_dict,
            stats_options.selected_shifts,
        )
        return build_stats_for_stats_unit(
            team_id,
            stats_options.header_unit,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            rest_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            i_to_work_shift,
            i_to_rest_shift,
            assignments,
            stats_options.stats_unit,
            stats_options.selected_shifts,
            stats_headers,
        )

    def get_shift_options(self, team_id: str) -> List[ShiftWorkerOption]:
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id)
        s_ids = [s.id for s in shifts]
        dimensions = (
            self.collection.dimension_db.get_dimensions_by_dim_types_not_deleted(
                [DimensionType.SHIFT, DimensionType.REST_SHIFT], team_id
            )
        )
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(s_ids)
        # pylint: disable=R0801
        dim_to_attributes: Dict[str, List[Attribute]] = {}
        for a in attributes:
            d_id = a.dimension_id
            if d_id not in dim_to_attributes:
                dim_to_attributes[d_id] = []
            dim_to_attributes[d_id].append(a)
        return build_options(
            AttributeOwnerType.SHIFT,
            shifts,
            dimensions,
            dim_entries,
            dim_to_attributes,
            [],
        )
