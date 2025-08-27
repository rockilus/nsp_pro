from typing import List

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    NewDimension,
)

from src.services.base_service import BaseService


class DimensionService(BaseService):
    def create_dimension(
        self, dimension: Dimension, dim_entries: List[DimEntry]
    ) -> NewDimension:
        d_created = self.collection.dimension_db.create_dimension(dimension)
        des_created: List[DimEntry] = []
        for dim_entry in dim_entries:
            dim_entry.dimension_id = d_created.id
            des_created.append(self.collection.dim_entry_db.create_dim_entry(dim_entry))
        attributes: List[Attribute] = []
        attributes_saved: List[Attribute] = []
        if d_created.entry_type == DimensionEntryType.BOOL:
            if DimensionType.SHIFT in d_created.dim_types:
                shifts = self.collection.shift_db.get_work_shifts(d_created.team_id)
                for shift in shifts:
                    # pylint: disable=R0801
                    attributes.append(
                        Attribute(
                            id="",
                            value=False,
                            owner_type=AttributeOwnerType.SHIFT,
                            owner_id=shift.id,
                            dimension_id=d_created.id,
                            dim_entry_ids=[],
                        )
                    )
            if DimensionType.REST_SHIFT in d_created.dim_types:
                shifts = self.collection.shift_db.get_rest_shifts(d_created.team_id)
                for shift in shifts:
                    # pylint: disable=R0801
                    attributes.append(
                        Attribute(
                            id="",
                            value=False,
                            owner_type=AttributeOwnerType.SHIFT,
                            owner_id=shift.id,
                            dimension_id=d_created.id,
                            dim_entry_ids=[],
                        )
                    )
            if DimensionType.WORKER in d_created.dim_types:
                workers = self.collection.worker_db.get_workers(d_created.team_id)
                for worker in workers:
                    attributes.append(
                        Attribute(
                            id="",
                            value=False,
                            owner_type=AttributeOwnerType.WORKER,
                            owner_id=worker.id,
                            dimension_id=d_created.id,
                            dim_entry_ids=[],
                        )
                    )
            attributes_saved = self.collection.attribute_db.create_attributes(
                attributes
            )
        return NewDimension(
            new_dimension=d_created,
            new_dim_entries=des_created,
            new_attributes=attributes_saved,
        )

    def delete_dimension(self, sd_id: str) -> None:
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_id(sd_id)
        for de in dim_entries:
            self.collection.dim_entry_db.logical_delete_dim_entry(de.id)
        self.collection.attribute_db.delete_attributes_by_dimension_id(sd_id)
        self.collection.dimension_db.logical_delete_dimension(sd_id)
