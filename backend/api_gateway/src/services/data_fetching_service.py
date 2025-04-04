from typing import List, Tuple

from shared.schemas import (
    Attribute,
    Dimension,
    DimEntry,
    Shift,
    Specialty,
    Worker,
)

from src.services.base_service import BaseService


# pylint: disable=R0801
class DataFetchingService(BaseService):
    def fetch_workers_shifts_dim_attributes_spe(self, team_id: str) -> Tuple[
        List[Worker],
        List[Shift],
        List[Dimension],
        List[DimEntry],
        List[Attribute],
        List[Specialty],
    ]:
        workers = self.collection.worker_db.get_workers(team_id)
        shifts = self.collection.shift_db.get_shifts(team_id)
        dimensions = self.collection.dimension_db.get_dimensions(team_id)
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
            [s.id for s in shifts] + [w.id for w in workers]
        )
        specialties = self.collection.specialty_db.get_specialties_by_team_id(team_id)
        return (
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        )

    def fetch_workers_not_d_shifts_not_d_dim_not_d_attributes_spes(
        self, team_id: str
    ) -> Tuple[
        List[Worker],
        List[Shift],
        List[Dimension],
        List[DimEntry],
        List[Attribute],
        List[Specialty],
    ]:
        workers = self.collection.worker_db.get_workers_not_deleted(team_id)
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id)
        sw_ids = [s.id for s in shifts] + [w.id for w in workers]
        dimensions = self.collection.dimension_db.get_dimensions_not_deleted(team_id)
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(sw_ids)
        specialties = (
            self.collection.specialty_db.get_specialties_not_deleted_by_team_id(team_id)
        )
        return (
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        )
