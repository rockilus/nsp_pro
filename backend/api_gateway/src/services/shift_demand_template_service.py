from typing import List, Optional

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
    create_template_from_demands,
)


class ShiftDemandTemplateService:
    """Service for managing shift demand templates."""

    def __init__(self, db_collections: DatabaseCollections):
        self.db = db_collections
        self.template_repo = db_collections.shift_demand_template_db

    async def create_template(
        self, template: ShiftDemandTemplate
    ) -> ShiftDemandTemplate:
        """Create a new shift demand template."""
        try:
            # Validate name uniqueness within team
            existing = self.template_repo.get_template_by_name_and_team(
                template.name, template.team_id
            )
            if existing:
                raise ValueError(
                    f"Template with name '{template.name}' already exists "
                    f"for team {template.team_id}"
                )

            # Create template
            created_template = self.template_repo.create_template(template)

            log_info(
                f"Created template {created_template.id} "
                f"'{created_template.name}' for team {template.team_id}"
            )

            return created_template

        except Exception as e:
            log_info(f"Failed to create template: {str(e)}")
            raise

    async def get_template_by_id(
        self, template_id: str
    ) -> Optional[ShiftDemandTemplate]:
        """Get a template by its ID."""
        try:
            return self.template_repo.get_template_by_id(template_id)
        except Exception as e:
            log_info(f"Failed to get template {template_id}: {str(e)}")
            raise

    async def get_templates_by_team(
        self, team_id: str, template_type: Optional[str] = None
    ) -> List[ShiftDemandTemplate]:
        """Get all templates for a team, optionally filtered by type."""
        try:
            if template_type:
                return self.template_repo.get_templates_by_team_and_type(
                    team_id, template_type
                )
            else:
                return self.template_repo.get_templates_by_team_id(team_id)
        except Exception as e:
            log_info(f"Failed to get templates for team {team_id}: {str(e)}")
            raise

    async def update_template(
        self, template: ShiftDemandTemplate
    ) -> ShiftDemandTemplate:
        """Update an existing template."""
        try:
            # Validate template exists
            existing = self.template_repo.get_template_by_id(template.id)
            if not existing:
                raise ValueError(f"Template with ID {template.id} not found")

            # Check name uniqueness if name changed
            if existing.name != template.name:
                name_conflict = self.template_repo.get_template_by_name_and_team(
                    template.name, template.team_id
                )
                if name_conflict and name_conflict.id != template.id:
                    raise ValueError(
                        f"Template with name '{template.name}' already exists "
                        f"for team {template.team_id}"
                    )

            # Update template
            updated_template = self.template_repo.update_template(template)

            log_info(
                f"Updated template {template.id} "
                f"'{template.name}' for team {template.team_id}"
            )

            return updated_template

        except Exception as e:
            log_info(f"Failed to update template {template.id}: {str(e)}")
            raise

    async def delete_template(self, template_id: str) -> bool:
        """Delete a template by its ID."""
        try:
            # Validate template exists
            template = self.template_repo.get_template_by_id(template_id)
            if not template:
                return False

            # Delete template
            success = self.template_repo.delete_template(template_id)

            if success:
                log_info(
                    f"Deleted template {template_id} "
                    f"'{template.name}' for team {template.team_id}"
                )

            return success

        except Exception as e:
            log_info(f"Failed to delete template {template_id}: {str(e)}")
            raise

    async def create_template_from_demands(
        self,
        name: str,
        team_id: str,
        template_type: TemplateType,
        shift_demands: List[dict],
        created_by: str,
        description: Optional[str] = None,
    ) -> ShiftDemandTemplate:
        """Create a template from existing shift demands."""
        try:
            # Validate name uniqueness within team
            existing = self.template_repo.get_template_by_name_and_team(name, team_id)
            if existing:
                raise ValueError(
                    f"Template with name '{name}' already exists " f"for team {team_id}"
                )

            # Create template using helper function
            template = create_template_from_demands(
                name=name,
                team_id=team_id,
                template_type=template_type,
                shift_demands=shift_demands,
                created_by=created_by,
                description=description,
            )

            # Save template
            created_template = self.template_repo.create_template(template)

            log_info(
                f"Created template from demands {created_template.id} "
                f"'{created_template.name}' for team {team_id}"
            )

            return created_template

        except Exception as e:
            log_info(f"Failed to create template from demands: {str(e)}")
            raise

    async def get_templates_by_created_by(
        self, created_by: str, team_id: str
    ) -> List[ShiftDemandTemplate]:
        """Get templates created by a specific user within a team."""
        try:
            return self.template_repo.get_templates_by_created_by(created_by, team_id)
        except Exception as e:
            log_info(
                f"Failed to get templates by creator {created_by} "
                f"for team {team_id}: {str(e)}"
            )
            raise

    async def validate_template_for_team(
        self, template_id: str, team_id: str
    ) -> ShiftDemandTemplate:
        """Validate template exists and belongs to team."""
        template = await self.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")

        if template.team_id != team_id:
            raise ValueError(
                f"Template {template_id} does not belong to team {team_id}"
            )

        return template
