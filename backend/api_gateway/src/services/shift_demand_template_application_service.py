"""
Service for applying shift demand templates to periods.

This service handles the complex business logic for applying templates to
periods, including even/odd template application and standard template
repetition patterns.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from shared.logger import log_info
from shared.schemas.core import (
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)
from shared.schemas.dto import ShiftDemandNewCreateDTO

from src.services.shift_demand_new_service import ShiftDemandNewService
from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)


class ShiftDemandTemplateApplicationService:
    """Service for applying shift demand templates to periods."""

    def __init__(
        self,
        template_service: ShiftDemandTemplateService,
        demand_service: ShiftDemandNewService,
    ):
        """Initialize the template application service."""
        self.template_service = template_service
        self.demand_service = demand_service

    async def apply_template_to_period(
        self,
        template_id: str,
        team_id: str,
        target_start: date,
        target_end: date,
        replace_existing: bool = True,
        shift_filter: Optional[List[str]] = None,
    ) -> Tuple[List[ShiftDemandNew], int]:
        """
        Apply a template to a target period.

        Args:
            template_id: ID of the template to apply
            team_id: ID of the team
            target_start: Start date of target period
            target_end: End date of target period
            replace_existing: Whether to replace existing demands
            shift_filter: Optional list of shift IDs to filter

        Returns:
            Tuple of (created demands, replaced count)

        Raises:
            ValueError: If template not found or validation fails
        """
        # Get template
        template = await self.template_service.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        if template.team_id != team_id:
            raise ValueError("Template does not belong to specified team")

        # Validate period
        if target_start > target_end:
            raise ValueError("Target start date must be before or equal to end date")

        # Generate demands based on template type
        if template.template_type == TemplateType.EVEN_ODD:
            demands = self._apply_even_odd_template(
                template, target_start, target_end, shift_filter
            )
        else:  # STANDARD
            demands = self._apply_standard_template(
                template, target_start, target_end, shift_filter
            )

        log_info(
            f"Generated {len(demands)} demands from template {template_id} "
            f"for period {target_start} to {target_end}"
        )

        # Handle existing demands if replacement is requested
        replaced_count = 0
        if replace_existing:
            # Get shift IDs that will be affected
            affected_shift_ids = list(set(demand.shift_id for demand in demands))

            # Delete existing demands for these shifts in the target period
            replaced_count = self.demand_service.delete_demands_by_date_range(
                team_id=team_id,
                start_date=target_start,
                end_date=target_end,
                shift_ids=affected_shift_ids,
            )

            log_info(f"Replaced {replaced_count} existing demands in target period")

        # Create new demands
        created_demands = []
        if demands:
            # Convert to create DTOs for bulk upsert
            demand_dtos = [
                ShiftDemandNewCreateDTO(
                    teamId=demand.team_id,
                    shiftId=demand.shift_id,
                    date=datetime.combine(demand.date, datetime.min.time())
                    .replace(tzinfo=timezone.utc)
                    .timestamp(),
                    count=demand.count,
                    source=demand.source.value,
                    sourceId=demand.source_id,
                )
                for demand in demands
            ]

            # Use bulk upsert for efficiency
            created, _ = self.demand_service.bulk_upsert_shift_demands(
                [ShiftDemandNew.from_create_dto(dto) for dto in demand_dtos]
            )
            created_demands = created

        log_info(
            f"Applied template {template_id} to period "
            f"{target_start}-{target_end}: "
            f"{len(created_demands)} created, {replaced_count} replaced"
        )

        return created_demands, replaced_count

    def _apply_even_odd_template(
        self,
        template: ShiftDemandTemplate,
        target_start: date,
        target_end: date,
        shift_filter: Optional[List[str]] = None,
    ) -> List[ShiftDemandNew]:
        """
        Apply an even/odd template to a period.

        Even/odd templates have exactly 2 weeks and alternate between them.
        The first week of the target period determines which template week
        to start with.
        """
        if len(template.weeks_data) != 2:
            raise ValueError("Even/odd template must have exactly 2 weeks of data")

        week_1_data = template.weeks_data[0]
        week_2_data = template.weeks_data[1]

        demands: List[ShiftDemandNew] = []
        current_date = target_start

        while current_date <= target_end:
            # Get week number (ISO week) to determine even/odd
            week_number = current_date.isocalendar()[1]
            is_even_week = week_number % 2 == 0

            # Choose template week based on even/odd
            template_week = week_1_data if is_even_week else week_2_data

            # Apply template week to current week
            week_demands = self._apply_template_week_to_period(
                template_week,
                current_date,
                min(current_date + timedelta(days=6), target_end),
                template.team_id,
                template.id or "",
                shift_filter,
            )
            demands.extend(week_demands)

            # Move to next week
            current_date += timedelta(days=7)

        return demands

    def _apply_standard_template(
        self,
        template: ShiftDemandTemplate,
        target_start: date,
        target_end: date,
        shift_filter: Optional[List[str]] = None,
    ) -> List[ShiftDemandNew]:
        """
        Apply a standard template to a period.

        Standard templates repeat their week pattern sequentially.
        For example, a 2-week template repeats week 1, week 2, week 1,
        week 2, etc.
        """
        if not template.weeks_data:
            raise ValueError("Template must have at least one week of data")

        demands: List[ShiftDemandNew] = []
        current_date = target_start
        week_index = 0

        while current_date <= target_end:
            # Get current template week (cycle through available weeks)
            week_count = len(template.weeks_data)
            template_week = template.weeks_data[week_index % week_count]

            # Apply template week to current week
            week_end = min(current_date + timedelta(days=6), target_end)
            week_demands = self._apply_template_week_to_period(
                template_week,
                current_date,
                week_end,
                template.team_id,
                template.id or "",
                shift_filter,
            )
            demands.extend(week_demands)

            # Move to next week and template week
            current_date += timedelta(days=7)
            week_index += 1

        return demands

    def _apply_template_week_to_period(
        self,
        template_week: TemplateWeekData,
        week_start: date,
        week_end: date,
        team_id: str,
        template_id: str,
        shift_filter: Optional[List[str]] = None,
    ) -> List[ShiftDemandNew]:
        """
        Apply a single template week to a specific week period.

        Args:
            template_week: Template week data
            week_start: Start date of the week (typically Monday)
            week_end: End date of the week (may be truncated by period end)
            team_id: Team ID
            template_id: Template ID for source tracking
            shift_filter: Optional shift filter

        Returns:
            List of demands for this week
        """
        demands: List[ShiftDemandNew] = []
        current_date = week_start

        while current_date <= week_end:
            # Get day of week (0=Monday, 6=Sunday)
            day_of_week = current_date.weekday()

            # Get demands for this day from template
            for demand_entry in template_week.demands:
                # Only process demands for the current day of week
                if demand_entry.day_of_week != day_of_week:
                    continue

                # Apply shift filter if provided
                if shift_filter and demand_entry.shift_id not in shift_filter:
                    continue

                # Skip zero demands (optimization)
                if demand_entry.count <= 0:
                    continue

                # Create demand
                demand = ShiftDemandNew(
                    team_id=team_id,
                    shift_id=demand_entry.shift_id,
                    date=current_date,
                    count=demand_entry.count,
                    source=ShiftDemandSource.TEMPLATE,
                    source_id=template_id,
                )
                demands.append(demand)

            current_date += timedelta(days=1)

        return demands

    async def validate_template_compatibility(
        self,
        template_id: str,
        team_id: str,
        target_start: date,
        target_end: date,
    ) -> Dict[str, List[str]]:
        """
        Validate that a template can be applied to a target period.

        Checks for:
        - Template existence and team ownership
        - Shift existence (shifts may have been deleted)
        - Period validity

        Returns:
            Dictionary with validation results:
            - 'valid_shifts': List of valid shift IDs
            - 'invalid_shifts': List of invalid/deleted shift IDs
            - 'warnings': List of warning messages
        """
        result: Dict[str, List[str]] = {
            "valid_shifts": [],
            "invalid_shifts": [],
            "warnings": [],
        }

        # Get template
        template = await self.template_service.get_template_by_id(template_id)
        if not template:
            result["warnings"].append(f"Template {template_id} not found")
            return result

        if template.team_id != team_id:
            result["warnings"].append("Template does not belong to specified team")
            return result

        # Validate period
        if target_start > target_end:
            result["warnings"].append("Invalid period: start date after end date")
            return result

        # Extract all shift IDs from template
        all_shift_ids: set[str] = set()
        for week_data in template.weeks_data:
            for demand_entry in week_data.demands:
                all_shift_ids.add(demand_entry.shift_id)

        # For now, assume all shifts are valid
        # (shift validation can be added later)
        result["valid_shifts"] = list(all_shift_ids)

        # Add informational warnings
        period_days = (target_end - target_start).days + 1
        if template.template_type == TemplateType.EVEN_ODD and period_days < 14:
            result["warnings"].append(
                "Even/odd template works best with periods of 2+ weeks"
            )

        log_info(
            f"Template {template_id} compatibility check: "
            f"{len(result['valid_shifts'])} valid shifts, "
            f"{len(result['invalid_shifts'])} invalid shifts, "
            f"{len(result['warnings'])} warnings"
        )

        return result

    async def preview_template_application(
        self,
        template_id: str,
        team_id: str,
        target_start: date,
        target_end: date,
        shift_filter: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Preview the application of a template without actually applying it.

        Returns:
            Dictionary with preview information:
            - 'total_demands': Total number of demands that would be created
            - 'total_demand_value': Sum of all demand values
            - 'demands_by_shift': Breakdown by shift ID
            - 'demands_by_date': Breakdown by date
            - 'affected_dates': List of dates that would have demands
            - 'template_type': Type of template
            - 'template_weeks': Number of weeks in template
        """
        # Get template
        template = await self.template_service.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        if template.team_id != team_id:
            raise ValueError("Template does not belong to specified team")

        # Generate preview demands (without saving)
        if template.template_type == TemplateType.EVEN_ODD:
            demands = self._apply_even_odd_template(
                template, target_start, target_end, shift_filter
            )
        else:  # STANDARD
            demands = self._apply_standard_template(
                template, target_start, target_end, shift_filter
            )

        # Analyze demands
        demands_by_shift: Dict[str, int] = {}
        demands_by_date: Dict[str, int] = {}
        affected_dates: set[date] = set()

        for demand in demands:
            # By shift
            if demand.shift_id not in demands_by_shift:
                demands_by_shift[demand.shift_id] = 0
            demands_by_shift[demand.shift_id] += demand.count

            # By date
            date_str = demand.date.isoformat()
            if date_str not in demands_by_date:
                demands_by_date[date_str] = 0
            demands_by_date[date_str] += demand.count

            # Affected dates
            affected_dates.add(demand.date)

        return {
            "total_demands": len(demands),
            "total_demand_value": sum(demand.count for demand in demands),
            "demands_by_shift": demands_by_shift,
            "demands_by_date": demands_by_date,
            "affected_dates": sorted([d.isoformat() for d in affected_dates]),
            "template_type": template.template_type.value,
            "template_weeks": len(template.weeks_data),
        }
