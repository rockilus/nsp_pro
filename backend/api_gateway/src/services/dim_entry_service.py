from typing import List

from shared.schemas.core import Attribute, DimEntry

from src.services.base_service import BaseService


class DimEntryService(BaseService):
    def create_dim_entry(self, dim_entry: DimEntry) -> DimEntry:
        dimension = self.collection.dimension_db.get_dimension_by_id(
            dim_entry.dimension_id
        )
        if dimension is None:
            raise ValueError("Dimension not found")
        de_created = self.collection.dim_entry_db.create_dim_entry(dim_entry)
        return de_created

    def delete_dim_entry(self, dim_entry_id: str) -> List[Attribute]:
        sps_with_dim_entry = (
            self.collection.attribute_db.get_attributes_by_dim_entry_id(dim_entry_id)
        )
        updated_sps: List[Attribute] = []
        for sp in sps_with_dim_entry:
            sp.dim_entry_ids.remove(dim_entry_id)
            updated_sps.append(sp)
        sps_saved = self.collection.attribute_db.update_attributes(updated_sps)
        self.collection.dim_entry_db.logical_delete_dim_entry(dim_entry_id)
        return sps_saved
