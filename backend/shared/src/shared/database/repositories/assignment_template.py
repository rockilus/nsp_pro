from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.assignment_template import (
    AssignmentTemplateSchema,
)
from shared.schemas.core.assignment_template import AssignmentTemplate


class AssignmentTemplateRepository(BaseRepository[AssignmentTemplateSchema]):
    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "assignment_templates",
            AssignmentTemplateSchema,
        )

    def create_template(self, template: AssignmentTemplate) -> AssignmentTemplate:
        template_schema = AssignmentTemplateSchema.from_core(template)
        result = self.create(template_schema)
        return result.to_core()

    def get_template_by_id(self, template_id: str) -> Optional[AssignmentTemplate]:
        template = self.find_by_id(template_id)
        if not template:
            return None
        return template.to_core()

    def get_templates_by_team_id(self, team_id: str) -> List[AssignmentTemplate]:
        templates = self.find_all({"team": team_id})
        return [t.to_core() for t in templates]

    def get_templates_by_team_and_type(
        self, team_id: str, template_type: str
    ) -> List[AssignmentTemplate]:
        templates = self.find_all({"team": team_id, "template_type": template_type})
        return [t.to_core() for t in templates]

    def update_template(self, template: AssignmentTemplate) -> AssignmentTemplate:
        if not template.id:
            raise ValueError("Template ID is required for update")
        template_schema = AssignmentTemplateSchema.from_core(template)
        result = self.update(template_schema)
        if not result:
            raise ValueError(f"Template with ID {template.id} not found")
        return result.to_core()

    def delete_template(self, template_id: str) -> bool:
        return self.delete(template_id)

    def get_template_by_name_and_team(
        self, name: str, team_id: str
    ) -> Optional[AssignmentTemplate]:
        template = self.find_one({"name": name, "team": team_id})
        if not template:
            return None
        return template.to_core()

    def get_templates_by_created_by(
        self, created_by: str, team_id: str
    ) -> List[AssignmentTemplate]:
        templates = self.find_all({"created_by": created_by, "team": team_id})
        return [t.to_core() for t in templates]
