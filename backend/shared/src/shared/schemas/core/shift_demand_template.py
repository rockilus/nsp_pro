from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.shift_demand_template import (
    ShiftDemandTemplateCreateDTO,
    ShiftDemandTemplateDTO,
    ShiftDemandTemplateUpdateDTO,
)


class TemplateType(str, Enum):
    """Type of template pattern."""

    STANDARD = "standard"  # Regular template (1-N weeks)
    EVEN_ODD = "even_odd"  # Even/odd week pattern (exactly 2 weeks)


@dataclass
class DemandEntry:
    """Individual demand entry for a specific shift and day."""

    shift_id: str
    day_of_week: int  # 0-6 (Monday=0, Sunday=6)
    count: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DemandEntry":
        """Create instance from dictionary."""
        return cls(**data)


@dataclass
class TemplateWeekData:
    """Represents demand data for a single week within a template."""

    week_number: int  # 0-based week index (0 for first week, 1 for second)
    demands: List[DemandEntry]  # List of demand entries

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TemplateWeekData":
        """Create instance from dictionary."""
        # Convert demand dictionaries back to DemandEntry objects
        demands = [DemandEntry.from_dict(demand) for demand in data["demands"]]
        return cls(week_number=data["week_number"], demands=demands)


@dataclass
class ShiftDemandTemplate:
    """
    Represents a reusable template for shift demands.

    Templates can be standard (1-N weeks) or even/odd patterns
    (exactly 2 weeks). They store the demand pattern that can be
    applied to future scheduling periods.
    """

    name: str
    team_id: str
    template_type: TemplateType
    weeks_data: List[TemplateWeekData]  # Week patterns
    description: Optional[str] = None
    created_by: str = ""  # User ID who created the template
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None

    # pylint: disable=too-many-branches
    def __post_init__(self):
        """Validate the template data."""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Template name is required")

        if len(self.name) > 100:
            raise ValueError("Template name must be 100 characters or less")

        if self.description and len(self.description) > 500:
            raise ValueError("Template description must be 500 characters or less")

        if not self.weeks_data:
            raise ValueError("Template must have at least one week of data")

        # Normalize weeks data to enforce constraints
        self.weeks_data = self._normalize_weeks_data(self.weeks_data)

        # Validate template type constraints
        if self.template_type == TemplateType.EVEN_ODD:
            if len(self.weeks_data) != 2:
                raise ValueError("Even/odd templates must have exactly 2 weeks")
        elif self.template_type == TemplateType.STANDARD:
            if (
                len(self.weeks_data) < 1 or len(self.weeks_data) > 8
            ):  # Reasonable max limit
                raise ValueError("Standard templates must have 1-8 weeks")

        # Validate week numbering
        expected_weeks = set(range(len(self.weeks_data)))
        actual_weeks = {week.week_number for week in self.weeks_data}
        if expected_weeks != actual_weeks:
            raise ValueError("Week numbers must be consecutive starting from 0")

    def _normalize_weeks_data(
        self, weeks_data: List[TemplateWeekData]
    ) -> List[TemplateWeekData]:
        """
        Normalize weeks data to enforce business rules:
        1. Remove demands with count 0
        2. Consolidate duplicate demands (same shift_id + day_of_week)

        Returns:
            List of normalized TemplateWeekData
        """
        normalized_weeks: List[TemplateWeekData] = []

        for week in weeks_data:
            # Group demands by (shift_id, day_of_week) and sum counts
            demand_groups: Dict[Tuple[str, int], int] = {}

            for demand in week.demands:
                # Validate individual demand entry
                if demand.day_of_week < 0 or demand.day_of_week > 6:
                    raise ValueError("Day of week must be between 0 and 6")
                if demand.count < 0:
                    raise ValueError("Demand counts must be non-negative")

                # Skip demands with count 0
                if demand.count == 0:
                    continue

                key = (demand.shift_id, demand.day_of_week)
                demand_groups[key] = demand_groups.get(key, 0) + demand.count

            # Create consolidated demand entries
            consolidated_demands: List[DemandEntry] = []
            for (shift_id, day_of_week), total_count in demand_groups.items():
                # Only add if total count > 0 (defensive check)
                if total_count > 0:
                    consolidated_demands.append(
                        DemandEntry(
                            shift_id=shift_id,
                            day_of_week=day_of_week,
                            count=total_count,
                        )
                    )

            # Sort demands for consistent ordering (by shift_id, then day_of_week)
            consolidated_demands.sort(key=lambda d: (d.shift_id, d.day_of_week))

            normalized_weeks.append(
                TemplateWeekData(
                    week_number=week.week_number, demands=consolidated_demands
                )
            )

        return normalized_weeks

    @property
    def week_count(self) -> int:
        """Get the number of weeks in this template."""
        return len(self.weeks_data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage."""
        out = asdict(self)
        out["template_type"] = self.template_type.value
        out["created_at"] = self.created_at.timestamp()
        out["updated_at"] = self.updated_at.timestamp()
        out["weeks_data"] = [week.to_dict() for week in self.weeks_data]
        return out

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ShiftDemandTemplate":
        """Create instance from MongoDB document."""
        data["template_type"] = TemplateType(data["template_type"])
        data["created_at"] = datetime.fromtimestamp(data["created_at"], tz=timezone.utc)
        data["updated_at"] = datetime.fromtimestamp(data["updated_at"], tz=timezone.utc)
        data["weeks_data"] = [
            TemplateWeekData.from_dict(week) for week in data["weeks_data"]
        ]
        return cls(**data)

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def to_dto(self) -> ShiftDemandTemplateDTO:
        """Convert to DTO for API responses."""
        data = asdict(self)
        data["template_type"] = self.template_type.value
        data["created_at"] = self.created_at.timestamp()
        data["updated_at"] = self.updated_at.timestamp()
        # Handle None id case
        if data["id"] is None:
            data["id"] = ""
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDemandTemplateDTO)
        return validator.validate_python(as_dict)

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    @classmethod
    def from_create_dto(
        cls,
        data: ShiftDemandTemplateCreateDTO,
        created_by: str,
        team_id: str,
        template_type: TemplateType,
        weeks_data: List[TemplateWeekData],
    ) -> "ShiftDemandTemplate":
        """Create instance from create DTO with server-managed fields."""
        # Server-managed fields
        now = datetime.now(timezone.utc)

        return cls(
            name=data.name,
            description=data.description,
            team_id=team_id,
            template_type=template_type,
            weeks_data=weeks_data,
            created_by=created_by,
            created_at=now,
            updated_at=now,
            id=None,  # Will be set by service layer
        )

    def update_from_dto(self, data: ShiftDemandTemplateUpdateDTO) -> None:
        """Update instance from update DTO with only provided fields."""
        data_dict = data.model_dump(exclude_unset=True)

        if "name" in data_dict:
            self.name = data_dict["name"]

        if "description" in data_dict:
            self.description = data_dict["description"]

        if "templateType" in data_dict:
            self.template_type = TemplateType(data_dict["templateType"])

        if "weeksData" in data_dict:
            # Convert DTO weeks data to core model
            weeks_data: List[TemplateWeekData] = []
            for week_dto in data_dict["weeksData"]:
                # Validate week_dto structure
                if not isinstance(week_dto, dict):
                    continue

                if "demands" not in week_dto or "weekNumber" not in week_dto:
                    continue

                demands_data = week_dto["demands"]
                if not isinstance(demands_data, list):
                    continue

                demand_entries: List[DemandEntry] = []
                for entry in demands_data:
                    if not isinstance(entry, dict):
                        continue

                    # Check required fields exist
                    required_fields = ["shiftId", "dayOfWeek", "count"]
                    if not all(field in entry for field in required_fields):
                        continue

                    try:
                        demand_entries.append(
                            DemandEntry(
                                shift_id=entry["shiftId"],
                                day_of_week=entry["dayOfWeek"],
                                count=entry["count"],
                            )
                        )
                    except (ValueError, TypeError):
                        # Log the error but continue processing other entries
                        continue

                try:
                    weeks_data.append(
                        TemplateWeekData(
                            week_number=week_dto["weekNumber"],
                            demands=demand_entries,
                        )
                    )
                except (ValueError, TypeError):
                    # Log the error but continue processing other weeks
                    continue

            # Apply normalization when updating weeks_data
            self.weeks_data = self._normalize_weeks_data(weeks_data)

        # Always update timestamp on any change
        self.update_timestamp()


# Helper functions for creating templates from existing shift demands
# pylint: disable=too-many-arguments, too-many-positional-arguments
# pylint: disable=too-many-locals
def create_template_from_demands(
    name: str,
    team_id: str,
    template_type: TemplateType,
    shift_demands: List[Dict[str, Any]],  # List of shift demand data
    created_by: str,
    description: Optional[str] = None,
) -> ShiftDemandTemplate:
    """
    Create a template from existing shift demands.

    Args:
        name: Template name
        team_id: Team ID
        template_type: Type of template
        shift_demands: List of shift demand data (with date, shift_id, count)
        created_by: User ID creating the template
        description: Optional description

    Returns:
        ShiftDemandTemplate instance
    """

    # Group demands by week and shift
    weeks_data: Dict[int, List[DemandEntry]] = {}

    # Find date range and group by weeks
    if not shift_demands:
        raise ValueError("Cannot create template from empty shift demands")

    # Sort demands by date
    sorted_demands = sorted(shift_demands, key=lambda x: x["date"])
    start_date = sorted_demands[0]["date"]

    # Ensure start_date is a Monday (ISO week start)
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    elif isinstance(start_date, (int, float)):
        start_date = datetime.fromtimestamp(start_date, tz=timezone.utc).date()

    # Find the Monday of the week containing start_date
    days_since_monday = start_date.weekday()
    week_start = start_date - timedelta(days=days_since_monday)

    # Group demands by week and day
    for demand in shift_demands:
        demand_date = demand["date"]
        if isinstance(demand_date, str):
            demand_date = datetime.strptime(demand_date, "%Y-%m-%d").date()
        elif isinstance(demand_date, (int, float)):
            demand_date = datetime.fromtimestamp(demand_date, tz=timezone.utc).date()

        # Calculate week number and day of week
        days_diff = (demand_date - week_start).days
        week_num = days_diff // 7
        day_of_week = days_diff % 7

        # Skip demands outside expected weeks
        expected_weeks = 2 if template_type == TemplateType.EVEN_ODD else 8  # Max weeks
        if week_num >= expected_weeks:
            continue

        if week_num not in weeks_data:
            weeks_data[week_num] = []

        # Add demand entry
        weeks_data[week_num].append(
            DemandEntry(
                shift_id=demand["shift_id"],
                day_of_week=day_of_week,
                count=demand["count"],
            )
        )

    # Convert to TemplateWeekData objects
    template_weeks: List[TemplateWeekData] = []
    for week_num in sorted(weeks_data.keys()):
        template_weeks.append(
            TemplateWeekData(week_number=week_num, demands=weeks_data[week_num])
        )

    return ShiftDemandTemplate(
        name=name,
        team_id=team_id,
        template_type=template_type,
        weeks_data=template_weeks,
        description=description,
        created_by=created_by,
    )


def apply_demands_to_template_week(
    template: ShiftDemandTemplate,
    source_week_demands: List[Dict[str, Any]],  # List of shift demand data
    target_week_number: int,
) -> ShiftDemandTemplate:
    """
    Apply shift demands from a source week to a specific template week.

    Args:
        template: The template to update
        source_week_demands: List of shift demand data for the source week
        target_week_number: 0-based week number in template to update

    Returns:
        Updated template with new demands applied to target week

    Raises:
        ValueError: If target week number is invalid
    """
    if target_week_number < 0 or target_week_number >= len(template.weeks_data):
        raise ValueError(
            f"Target week number {target_week_number} is out of range. "
            f"Template has {len(template.weeks_data)} weeks "
            f"(0-{len(template.weeks_data)-1})"
        )

    # Convert source week demands to DemandEntry format
    new_demands: List[DemandEntry] = []
    for demand in source_week_demands:
        demand_date = demand["date"]
        if isinstance(demand_date, str):
            demand_date = datetime.strptime(demand_date, "%Y-%m-%d").date()
        elif isinstance(demand_date, (int, float)):
            demand_date = datetime.fromtimestamp(demand_date, tz=timezone.utc).date()

        # Calculate day of week (0=Monday, 6=Sunday)
        day_of_week = demand_date.weekday()

        # Add demand entry
        new_demands.append(
            DemandEntry(
                shift_id=demand["shift_id"],
                day_of_week=day_of_week,
                count=demand["count"],
            )
        )

    # Update the target week in template
    updated_weeks_data: List[TemplateWeekData] = []
    for week in template.weeks_data:
        if week.week_number == target_week_number:
            # Replace the demands for the target week
            updated_weeks_data.append(
                TemplateWeekData(week_number=target_week_number, demands=new_demands)
            )
        else:
            updated_weeks_data.append(week)

    # Create updated template
    updated_template = ShiftDemandTemplate(
        id=template.id,
        name=template.name,
        team_id=template.team_id,
        template_type=template.template_type,
        weeks_data=updated_weeks_data,
        description=template.description,
        created_by=template.created_by,
        created_at=template.created_at,
        updated_at=datetime.now(timezone.utc),
    )

    return updated_template


def apply_template_to_date_range(
    template: ShiftDemandTemplate,
    start_date: date,
    end_date: date,
    team_id: str,
) -> List[Dict[str, Any]]:
    """
    Apply template to a specific date range.

    Args:
        template: The template to apply
        start_date: Start date of the target period
        end_date: End date of the target period
        team_id: Team ID for the demands

    Returns:
        List of shift demands to create/update

    Raises:
        ValueError: If date range is invalid
    """
    if start_date > end_date:
        raise ValueError("End date must be after or equal to start date")

    if (end_date - start_date).days > 365:  # Max 1 year
        raise ValueError("Date range cannot exceed 365 days")

    # Calculate template application mapping
    mappings = _calculate_template_application_mapping(template, start_date, end_date)

    # Generate demands from mapping
    demands = _generate_demands_from_mapping(template, mappings, team_id)

    return demands


def _calculate_template_application_mapping(
    template: ShiftDemandTemplate,
    start_date: date,
    end_date: date,
) -> List[Tuple[date, int, int]]:
    """
    Calculate how template weeks map to target dates.

    Returns list of (target_date, template_week_number, template_day_of_week).
    """
    mappings: List[Tuple[date, int, int]] = []
    current_date = start_date
    template_week = 0  # Initialize template_week
    week_cycle_length = len(template.weeks_data)  # Initialize for all cases

    if template.template_type == TemplateType.STANDARD:
        # Standard: cycle through weeks 0, 1, 2, ..., n-1, 0, 1, 2, ...

        # Calculate which template week to start with based on start_date
        # This ensures Monday-Sunday alignment
        start_monday = current_date - timedelta(days=current_date.weekday())
        # Use epoch Monday (1970-01-05) as reference
        days_since_epoch = (start_monday - date(1970, 1, 5)).days
        starting_template_week = (days_since_epoch // 7) % week_cycle_length

        template_week = starting_template_week

    elif template.template_type == TemplateType.EVEN_ODD:
        # Even/Odd: determine if start week is even or odd
        start_monday = current_date - timedelta(days=current_date.weekday())
        days_since_epoch = (start_monday - date(1970, 1, 5)).days
        week_number = days_since_epoch // 7
        template_week = 0 if week_number % 2 == 0 else 1  # Even=0, Odd=1

    while current_date <= end_date:
        template_day = current_date.weekday()  # 0=Monday, 6=Sunday
        mappings.append((current_date, template_week, template_day))

        current_date += timedelta(days=1)

        # Update template week for next iteration
        if current_date.weekday() == 0:  # Monday = start of new week
            if template.template_type == TemplateType.STANDARD:
                template_week = (template_week + 1) % week_cycle_length
            elif template.template_type == TemplateType.EVEN_ODD:
                template_week = 1 - template_week  # Toggle between 0 and 1

    return mappings


def _generate_demands_from_mapping(
    template: ShiftDemandTemplate,
    mappings: List[Tuple[date, int, int]],
    team_id: str,
) -> List[Dict[str, Any]]:
    """Generate shift demands based on template-to-date mappings."""
    demands: List[Dict[str, Any]] = []

    for target_date, template_week, template_day in mappings:
        # Find template week data
        week_data = next(
            (w for w in template.weeks_data if w.week_number == template_week),
            None,
        )

        if not week_data:
            continue

        # Find demands for this day
        day_demands = [d for d in week_data.demands if d.day_of_week == template_day]

        for demand_entry in day_demands:
            if demand_entry.count > 0:
                demands.append(
                    {
                        "date": target_date,
                        "shift_id": demand_entry.shift_id,
                        "count": demand_entry.count,
                        "team_id": team_id,
                    }
                )

    return demands
