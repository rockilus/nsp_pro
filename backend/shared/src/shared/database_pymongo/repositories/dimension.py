from typing import List

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.dimension import DimensionSchema
from shared.schemas.schemas.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)


class DimensionRepository(BaseRepository[DimensionSchema]):
    """Repository for dimension documents using PyMongo."""

    def __init__(self):
        super().__init__("dimensions", DimensionSchema)

    def create_dimension(self, dimension: Dimension) -> Dimension:
        """Create a new dimension."""
        dimension_schema = DimensionSchema.from_core(dimension)
        result = self.create(dimension_schema)
        return result.to_core()

    def get_dimensions_by_dim_types_not_deleted(
        self, dim_type: List[DimensionType], team_id: str
    ) -> List[Dimension]:
        """Get all non-deleted dimensions by type for a team."""
        dimensions = self.find_all(
            {
                "team": team_id,
                "dim_types": {"$in": [dt.value for dt in dim_type]},
                "deleted": False,
            }
        )
        return [dimension.to_core() for dimension in dimensions]

    def get_dimension_by_id(self, dimension_id: str) -> Dimension:
        """Get a dimension by its ID."""
        dimension = self.find_by_id(dimension_id)
        if not dimension:
            raise Exception(f"Dimension with id {dimension_id} not found")
        return dimension.to_core()

    def get_dimensions_by_dim_types_and_entry_type(
        self,
        dim_types: List[DimensionType],
        entry_type: DimensionEntryType,
        team_id: str,
    ) -> List[Dimension]:
        """Get all dimensions by type and entry type for a team."""
        dimensions = self.find_all(
            {
                "team": team_id,
                "dim_types": {"$in": [dt.value for dt in dim_types]},
                "entry_type": entry_type.value,
            }
        )
        return [dimension.to_core() for dimension in dimensions]

    def get_dimensions(self, team_id: str) -> List[Dimension]:
        """Get all dimensions for a team."""
        dimensions = self.find_all({"team": team_id})
        return [dimension.to_core() for dimension in dimensions]

    def get_dimensions_not_deleted(self, team_id: str) -> List[Dimension]:
        """Get all non-deleted dimensions for a team."""
        dimensions = self.find_all({"team": team_id, "deleted": False})
        return [dimension.to_core() for dimension in dimensions]

    def update_dimension(self, dimension: Dimension) -> Dimension:
        """Update a dimension."""
        dimension_schema = DimensionSchema.from_core(dimension)
        dimension_updated = self.update(dimension_schema)
        assert dimension_updated is not None
        return dimension_updated.to_core()

    def delete_dimension(self, dimension_id: str) -> None:
        """Delete a dimension by its ID."""
        result = self.delete(dimension_id)
        if result is False:
            raise Exception(
                f"Dimension with id {dimension_id} not found or already deleted"
            )

    def logical_delete_dimension(self, dimension_id: str) -> Dimension:
        """Mark a dimension as deleted."""
        result = self.collection.update_one(
            {"_id": ObjectId(dimension_id)}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Dimension with id {dimension_id} not found")

        dimension = self.find_by_id(dimension_id)
        if not dimension:
            raise Exception(
                f"Failed to retrieve updated dimension with id {dimension_id}"
            )

        return dimension.to_core()
