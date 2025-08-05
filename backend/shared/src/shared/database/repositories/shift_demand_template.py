from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.shift_demand_template import (
    ShiftDemandTemplateSchema,
)
from shared.schemas.core.shift_demand_template import ShiftDemandTemplate


class ShiftDemandTemplateRepository(BaseRepository[ShiftDemandTemplateSchema]):
    """Repository for shift demand template documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "shift_demand_templates",
            ShiftDemandTemplateSchema,
        )

    def create_template(self, template: ShiftDemandTemplate) -> ShiftDemandTemplate:
        """Create a new shift demand template."""
        template_schema = ShiftDemandTemplateSchema.from_core(template)
        result = self.create(template_schema)
        return result.to_core()

    def get_template_by_id(self, template_id: str) -> Optional[ShiftDemandTemplate]:
        """Get a template by its ID."""
        template = self.find_by_id(template_id)
        if not template:
            return None
        return template.to_core()

    def get_templates_by_team_id(self, team_id: str) -> List[ShiftDemandTemplate]:
        """Get all templates for a team."""
        templates = self.find_all({"team": team_id})
        return [template.to_core() for template in templates]

    def get_templates_by_team_and_type(
        self, team_id: str, template_type: str
    ) -> List[ShiftDemandTemplate]:
        """Get templates for a team filtered by template type."""
        templates = self.find_all({"team": team_id, "template_type": template_type})
        return [template.to_core() for template in templates]

    def update_template(self, template: ShiftDemandTemplate) -> ShiftDemandTemplate:
        """Update an existing template."""
        if not template.id:
            raise ValueError("Template ID is required for update")

        template_schema = ShiftDemandTemplateSchema.from_core(template)
        result = self.update(template_schema)
        if not result:
            raise ValueError(f"Template with ID {template.id} not found")
        return result.to_core()

    def delete_template(self, template_id: str) -> bool:
        """Delete a template by ID."""
        return self.delete(template_id)

    def get_template_by_name_and_team(
        self, name: str, team_id: str
    ) -> Optional[ShiftDemandTemplate]:
        """Get a template by name within a team (for uniqueness checks)."""
        template = self.find_one({"name": name, "team": team_id})
        if not template:
            return None
        return template.to_core()

    def get_templates_by_created_by(
        self, created_by: str, team_id: str
    ) -> List[ShiftDemandTemplate]:
        """Get templates created by a specific user within a team."""
        templates = self.find_all({"created_by": created_by, "team": team_id})
        return [template.to_core() for template in templates]
