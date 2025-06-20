from typing import List, Optional

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.multitasking import MultitaskingGroupSchema
from shared.schemas.core.multitasking import MultitaskingGroup


class MultitaskingGroupRepository(BaseRepository[MultitaskingGroupSchema]):
    """Repository for multitasking group documents using PyMongo."""

    def __init__(self):
        super().__init__("multitasking_groups", MultitaskingGroupSchema)

    def create_group(self, group: MultitaskingGroup) -> MultitaskingGroup:
        group_schema = MultitaskingGroupSchema.from_core(group)
        result = self.create(group_schema)
        return result.to_core()

    def get_group_by_id(self, group_id: str) -> Optional[MultitaskingGroup]:
        group = self.find_by_id(group_id)
        if not group:
            return None
        return group.to_core()

    def get_groups_by_team_id(self, team_id: str) -> List[MultitaskingGroup]:
        groups = self.find_all({"team_id": team_id})
        return [group.to_core() for group in groups]

    def update_group(self, group: MultitaskingGroup) -> MultitaskingGroup:
        group_schema = MultitaskingGroupSchema.from_core(group)
        group_updated = self.update(group_schema)
        if not group_updated:
            raise ValueError(f"Failed to update multitasking group with id {group.id}")
        return group_updated.to_core()

    def delete_group(self, group_id: str) -> bool:
        return self.delete(group_id)

    def get_groups_by_template_id(self, template_id: str) -> List[MultitaskingGroup]:
        groups = self.find_all({"shift_demand_template_id": template_id})
        return [group.to_core() for group in groups]

    def get_groups_by_related_id(self, related_id: str) -> List[MultitaskingGroup]:
        groups = self.find_all({"related_ids": related_id})
        return [group.to_core() for group in groups]
