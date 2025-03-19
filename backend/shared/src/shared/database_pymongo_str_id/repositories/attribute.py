from typing import Any, Dict, List, Mapping, Sequence

from shared.database_pymongo_str_id.repositories.base import BaseRepository
from shared.database_pymongo_str_id.schemas.attribute import AttributeSchema
from shared.schemas.schemas.attribute import Attribute


class AttributeRepository(BaseRepository[AttributeSchema]):
    """Repository for attribute documents using PyMongo."""

    def __init__(self):
        super().__init__("attributes", AttributeSchema)

    def create_attribute(self, attribute: Attribute) -> Attribute:
        """Create a new attribute."""
        attribute_schema = AttributeSchema.from_core(attribute)
        result = self.create(attribute_schema)
        return result.to_core()

    def create_attributes(self, attributes: List[Attribute]) -> List[Attribute]:
        """Create multiple attributes at once."""
        if not attributes:
            return []

        attribute_schemas = [AttributeSchema.from_core(attr) for attr in attributes]
        result = self.create_many(attribute_schemas)
        return [attr.to_core() for attr in result]

    def get_attributes_by_owner_id(self, owner_id: str) -> List[Attribute]:
        """Get all attributes for an owner."""
        attributes = self.find_all({"owner": owner_id})
        return [attr.to_core() for attr in attributes]

    def get_attributes_by_owner_ids(self, owner_ids: List[str]) -> List[Attribute]:
        """Get all attributes for multiple owners."""
        attributes = self.find_all({"owner": {"$in": owner_ids}})
        return [attr.to_core() for attr in attributes]

    def get_attributes_by_dimension_id(self, dimension_id: str) -> List[Attribute]:
        """Get all attributes for a dimension."""
        attributes = self.find_all({"dimension": dimension_id})
        return [attr.to_core() for attr in attributes]

    def get_attribute_by_id(self, attribute_id: str) -> Attribute:
        """Get an attribute by its ID."""
        attribute = self.find_by_id(attribute_id)
        if not attribute:
            raise Exception(f"Attribute with id {attribute_id} not found")
        return attribute.to_core()

    def get_shifts_id_by_dim_and_attr(self) -> Dict:
        """Get shifts by dimension and attribute."""
        pipeline: Sequence[Mapping[str, Any]] = [
            {"$unwind": "$value"},
            {
                "$group": {
                    "_id": {
                        "dimension": "$dimension",
                        "value": "$value",
                    },
                    "shifts": {"$push": "$owner"},
                }
            },
            {
                "$lookup": {
                    "from": "dimensions",
                    "localField": "_id.dimension",
                    "foreignField": "_id",
                    "as": "dimension_data",
                }
            },
            {"$unwind": "$dimension_data"},
            {
                "$project": {
                    "_id": "$_id.dimension",
                    "dim_name": "$dimension_data.name",
                    "prop_value": "$_id.value",
                    "shifts": 1,
                }
            },
        ]
        result = self.collection.aggregate(pipeline)
        out: Dict = {}
        for r in result:
            dim, _, attr_value, shifts = (
                str(r["_id"]),
                r["dim_name"].lower(),
                r["prop_value"],
                r["shifts"],
            )
            attr_value_mod = (
                attr_value.lower() if not isinstance(attr_value, bool) else attr_value
            )
            if dim not in out:
                out[dim] = {}
            if attr_value_mod not in out[dim]:
                out[dim][attr_value_mod] = shifts
            else:
                out[dim][attr_value_mod] += shifts
        return out

    def get_attributes_by_dim_entry_id(self, dim_entry_id: str) -> List[Attribute]:
        """Get all attributes for a dimension entry."""
        attributes = self.find_all({"dim_entries": {"$in": [dim_entry_id]}})
        return [attr.to_core() for attr in attributes]

    def update_attribute(self, attribute: Attribute) -> Attribute:
        """Update an attribute."""
        attribute_schema = AttributeSchema.from_core(attribute)
        updated_attribute = self.update(attribute_schema)
        assert updated_attribute is not None
        return updated_attribute.to_core()

    def update_attributes(self, attributes: List[Attribute]) -> List[Attribute]:
        """Update multiple attributes."""
        if not attributes:
            return []

        updated_attributes = []
        for attribute in attributes:
            updated = self.update_attribute(attribute)
            updated_attributes.append(updated)

        return updated_attributes

    def delete_attributes_by_owner_id(self, owner_id: str) -> None:
        """Delete attributes by owner ID."""
        self.collection.delete_many({"owner": owner_id})

    def delete_attributes_by_dimension_id(self, dimension_id: str) -> None:
        """Delete attributes by dimension ID."""
        self.collection.delete_many({"dimension": dimension_id})
