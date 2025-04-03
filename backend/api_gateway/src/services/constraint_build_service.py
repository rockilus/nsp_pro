from typing import List

from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.schemas import ConstraintBuild, ConstraintBuildAugmented

from src.services.base_service import BaseService
from src.services.data_fetching_service import DataFetchingService


class ConstraintBuildService(BaseService):
    def __init__(self, collection, data_fetching_service: DataFetchingService):
        super().__init__(collection)
        self.data_fetching_service = data_fetching_service

    def create_constraint_build(
        self, cb_data: ConstraintBuild
    ) -> ConstraintBuildAugmented:
        constraint_build = self.collection.constraint_build_db.create_constraint_build(
            cb_data
        )
        schedule_campaign = self.collection.schedule_db.get_schedule_campaign(
            cb_data.team_id
        )
        if schedule_campaign:
            schedule_campaign.constraint_build_ids.append(constraint_build.id)
            self.collection.schedule_db.update_schedule(schedule_campaign)
        # pylint: disable=R0801
        (
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        ) = self.data_fetching_service.fetch_workers_shifts_dim_attributes_spe(
            constraint_build.team_id
        )
        return cb_to_cb_augmented(
            constraint_build,
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        )

    def get_constraint_builds(self, team_id: str) -> List[ConstraintBuildAugmented]:
        # pylint: disable=R0801
        constraint_builds = self.collection.constraint_build_db.get_constraint_builds(
            team_id
        )
        (
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        ) = self.data_fetching_service.fetch_workers_shifts_dim_attributes_spe(team_id)
        return [
            cb_to_cb_augmented(
                cb,
                workers,
                shifts,
                dimensions,
                dim_entries,
                attributes,
                specialties,
            )
            for cb in constraint_builds
        ]

    def update_constraint_build(
        self, new_cb: ConstraintBuild
    ) -> ConstraintBuildAugmented:
        constraint_build = self.collection.constraint_build_db.update_constraint_build(
            new_cb
        )
        (
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        ) = self.data_fetching_service.fetch_workers_shifts_dim_attributes_spe(
            constraint_build.team_id
        )
        return cb_to_cb_augmented(
            constraint_build,
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        )

    def delete_constraint_build(self, team_id: str, cb_id: str) -> None:
        self.collection.constraint_build_db.delete_constraint_build(cb_id)
        schedule_campaign = (
            self.collection.schedule_db.get_schedule_campaign_by_constraint_build_id(
                team_id, cb_id
            )
        )
        if schedule_campaign:
            schedule_campaign.constraint_build_ids.remove(cb_id)
            self.collection.schedule_db.update_schedule(schedule_campaign)
