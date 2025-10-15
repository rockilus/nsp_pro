from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core.shift_demand_new import (
    ShiftDemandNew,
    ShiftDemandSource,
)
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
    apply_demands_to_template_week,
    apply_template_to_date_range,
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
            return self.template_repo.get_templates_by_team_id(team_id)
        except Exception as e:
            log_info(f"Failed to get templates for team {team_id}: {str(e)}")
            raise

    async def update_template(
        self, template: ShiftDemandTemplate
    ) -> ShiftDemandTemplate:
        """Update an existing template."""
        try:
            # Validate template has ID for update operation
            if not template.id:
                raise ValueError(
                    "Template ID is required for update operation"
                )
            # Validate template exists
            existing = self.template_repo.get_template_by_id(template.id)
            if not existing:
                raise ValueError(f"Template with ID {template.id} not found")

            # Check name uniqueness if name changed
            if existing.name != template.name:
                name_conflict = (
                    self.template_repo.get_template_by_name_and_team(
                        template.name, template.team_id
                    )
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

    # pylint: disable=too-many-arguments, too-many-positional-arguments
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
            existing = self.template_repo.get_template_by_name_and_team(
                name, team_id
            )
            if existing:
                raise ValueError(
                    f"Template with name '{name}' already exists "
                    f"for team {team_id}"
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
            return self.template_repo.get_templates_by_created_by(
                created_by, team_id
            )
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

    async def apply_demands_to_template_week(
        self,
        template_id: str,
        team_id: str,
        source_week_start: datetime,
        target_week_number: int,
    ) -> ShiftDemandTemplate:
        """
        Apply existing shift demands from a source week to a template week.

        Args:
            template_id: Template identifier
            team_id: Team identifier for validation
            source_week_start: Start of source week (should be Monday)
            target_week_number: 0-based week number in template to update

        Returns:
            Updated template with new demands applied to target week

        Raises:
            ValueError: If template doesn't exist, doesn't belong to team,
                       or target week is invalid
        """
        try:
            # Validate template exists and belongs to team
            template = await self.validate_template_for_team(
                template_id, team_id
            )

            # Calculate week date range (Monday to Sunday)
            week_start = source_week_start - timedelta(
                days=source_week_start.weekday()
            )
            week_end = week_start + timedelta(days=6)

            # Fetch existing shift demands for the source week
            # Use ShiftDemandNew which is the current shift demand system
            source_demands = (
                self.db.shift_demand_new_db.get_shift_demands_by_date_range(
                    team_id=team_id,
                    start_date=week_start.date(),
                    end_date=week_end.date(),
                )
            )

            # Convert shift demands to the format expected by the core function
            demands_data = []
            for demand in source_demands:
                demands_data.append(
                    {
                        "date": demand.date,
                        "shift_id": demand.shift_id,
                        "count": demand.count,
                    }
                )

            # Apply demands to template using core function
            updated_template = apply_demands_to_template_week(
                template=template,
                source_week_demands=demands_data,
                target_week_number=target_week_number,
            )

            # Save updated template
            saved_template = self.template_repo.update_template(
                updated_template
            )

            log_info(
                f"Applied demands from week {week_start.date()} to template "
                f"{template_id} week {target_week_number} for team {team_id}"
            )

            return saved_template

        except Exception as e:
            log_info(f"Failed to apply demands to template week: {str(e)}")
            raise

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    async def apply_template_to_date_range(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        overwrite_existing: bool = True,
    ) -> Dict[str, int]:
        """
        Apply a template to a specific date range.

        Args:
            template_id: ID of the template to apply
            team_id: Team ID for validation and demand creation
            start_date: Start date of the target period
            end_date: End date of the target period
            overwrite_existing: Whether to overwrite existing demands

        Returns:
            Dictionary with counts of created/updated/deleted demands

        Raises:
            ValueError: If template not found or validation fails
        """
        try:
            # Validate template exists and belongs to team
            template = await self.validate_template_for_team(
                template_id, team_id
            )

            # Generate demands from template application
            demands_to_create = apply_template_to_date_range(
                template=template,
                start_date=start_date,
                end_date=end_date,
                team_id=team_id,
            )

            log_info(
                f"Generated {len(demands_to_create)} demands from template "
                f"{template_id} for date range {start_date} to {end_date}"
            )

            if overwrite_existing:
                return await self._apply_template_with_overwrite(
                    template_id=template_id,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    demands_to_create=demands_to_create,
                )
            else:
                return await self._apply_template_with_merge(
                    template_id=template_id,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    demands_to_create=demands_to_create,
                )

        except Exception as e:
            log_info(f"Failed to apply template to date range: {str(e)}")
            raise

    async def _apply_template_with_overwrite(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        demands_to_create: List[dict],
    ) -> Dict[str, int]:
        """
        Apply template with overwrite mode - delete existing and create new.

        Args:
            template_id: Template identifier
            team_id: Team identifier
            start_date: Start of target period
            end_date: End of target period
            demands_to_create: List of demand dictionaries from template

        Returns:
            Dictionary with operation counts
        """
        # Delete existing demands for the date range
        demands_deleted = (
            self.db.shift_demand_new_db.delete_demands_by_date_range(
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
            )
        )

        # Create new demands from template
        demands_created = 0
        for demand in demands_to_create:
            shift_demand = ShiftDemandNew(
                date=demand["date"],
                shift_id=demand["shift_id"],
                team_id=demand["team_id"],
                count=demand["count"],
                source=ShiftDemandSource.TEMPLATE,
                source_id=template_id,
            )
            self.db.shift_demand_new_db.create_shift_demand(shift_demand)
            demands_created += 1

        log_info(
            f"Applied template {template_id} with overwrite to date range "
            f"{start_date} to {end_date}: "
            f"created {demands_created}, deleted {demands_deleted} demands"
        )

        return {
            "demands_created": demands_created,
            "demands_updated": 0,
            "demands_deleted": demands_deleted,
        }

    async def _apply_template_with_merge(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        demands_to_create: List[dict],
    ) -> Dict[str, int]:
        """
        Apply template with merge mode - add to or update existing demands.

        When a demand exists for the same shift and date:
        - Sum the counts from template and existing demand
        - Update the existing demand

        When a demand doesn't exist:
        - Create new demand from template

        Args:
            template_id: Template identifier
            team_id: Team identifier
            start_date: Start of target period
            end_date: End of target period
            demands_to_create: List of demand dictionaries from template

        Returns:
            Dictionary with operation counts
        """
        # Fetch existing demands for the date range
        existing_demands = (
            self.db.shift_demand_new_db.get_shift_demands_by_date_range(
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
            )
        )

        # Create lookup map for existing demands by (shift_id, date)
        existing_demands_map = {
            (demand.shift_id, demand.date): demand
            for demand in existing_demands
        }

        demands_created = 0
        demands_updated = 0

        # Process each demand from template
        for demand_dict in demands_to_create:
            demand_key = (demand_dict["shift_id"], demand_dict["date"])

            if demand_key in existing_demands_map:
                # Update existing demand by summing counts
                existing_demand = existing_demands_map[demand_key]
                existing_demand.count += demand_dict["count"]
                existing_demand.update_timestamp()

                self.db.shift_demand_new_db.update_shift_demand(
                    existing_demand
                )
                demands_updated += 1
            else:
                # Create new demand from template
                new_demand = ShiftDemandNew(
                    date=demand_dict["date"],
                    shift_id=demand_dict["shift_id"],
                    team_id=demand_dict["team_id"],
                    count=demand_dict["count"],
                    source=ShiftDemandSource.TEMPLATE,
                    source_id=template_id,
                )
                self.db.shift_demand_new_db.create_shift_demand(new_demand)
                demands_created += 1

        log_info(
            f"Applied template {template_id} with merge to date range "
            f"{start_date} to {end_date}: "
            f"created {demands_created}, updated {demands_updated} demands"
        )

        return {
            "demands_created": demands_created,
            "demands_updated": demands_updated,
            "demands_deleted": 0,
        }
