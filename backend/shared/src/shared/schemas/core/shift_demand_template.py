from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

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

        # Validate demand data structure
        for week in self.weeks_data:
            for demand_entry in week.demands:
                if demand_entry.day_of_week < 0 or demand_entry.day_of_week > 6:
                    raise ValueError("Day of week must be between 0 and 6")
                if demand_entry.count < 0:
                    raise ValueError("Demand counts must be non-negative")

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

                demand_entries = []
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
            self.weeks_data = weeks_data

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
