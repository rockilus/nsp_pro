"""Tests for shift demand template core models."""

import time
from datetime import datetime, timezone

import pytest

from shared.schemas.core.shift_demand_template import (
    DemandEntry,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
    create_template_from_demands,
)


class TestShiftDemandTemplate:
    """Test shift demand template functionality."""

    def test_template_creation_basic(self):
        """Test basic template creation."""
        # Create demand entries for the new format
        demands = [
            DemandEntry(shift_id="shift1", day_of_week=0, count=2),  # Monday
            DemandEntry(shift_id="shift1", day_of_week=1, count=3),  # Tuesday
            DemandEntry(shift_id="shift2", day_of_week=0, count=1),  # Monday
        ]

        weeks_data = [TemplateWeekData(week_number=0, demands=demands)]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
            description="Test description",
        )

        assert template.name == "Test Template"
        assert template.team_id == "team1"
        assert template.template_type == TemplateType.STANDARD
        assert len(template.weeks_data) == 1
        assert template.week_count == 1
        assert template.description == "Test description"
        assert template.created_by == "user1"
        assert len(template.weeks_data[0].demands) == 3

    def test_template_validation_errors(self):
        """Test template validation catches errors."""
        demands = [DemandEntry(shift_id="shift1", day_of_week=0, count=2)]
        weeks_data = [TemplateWeekData(week_number=0, demands=demands)]

        # Empty name
        with pytest.raises(ValueError, match="Template name is required"):
            ShiftDemandTemplate(
                name="",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Name too long
        with pytest.raises(
            ValueError, match="Template name must be 100 characters or less"
        ):
            ShiftDemandTemplate(
                name="x" * 101,
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Description too long
        with pytest.raises(
            ValueError,
            match="Template description must be 500 characters or less",
        ):
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
                description="x" * 501,
            )

        # No weeks data
        with pytest.raises(
            ValueError, match="Template must have at least one week of data"
        ):
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=[],
                created_by="user1",
            )

    def test_even_odd_template_validation(self):
        """Test even/odd template validation."""
        demands = [DemandEntry(shift_id="shift1", day_of_week=0, count=2)]

        # Even/odd template with wrong number of weeks
        with pytest.raises(
            ValueError, match="Even/odd templates must have exactly 2 weeks"
        ):
            weeks_data = [TemplateWeekData(week_number=0, demands=demands)]
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.EVEN_ODD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Valid even/odd template
        weeks_data = [
            TemplateWeekData(week_number=0, demands=demands),
            TemplateWeekData(week_number=1, demands=demands),
        ]
        template = ShiftDemandTemplate(
            name="Test",
            team_id="team1",
            template_type=TemplateType.EVEN_ODD,
            weeks_data=weeks_data,
            created_by="user1",
        )
        assert len(template.weeks_data) == 2

    def test_demand_data_validation(self):
        """Test validation of demand data structure."""
        # Invalid day of week
        with pytest.raises(ValueError, match="Day of week must be between 0 and 6"):
            demands = [
                DemandEntry(shift_id="shift1", day_of_week=7, count=2)
            ]  # Invalid day
            weeks_data = [TemplateWeekData(week_number=0, demands=demands)]
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Negative count
        with pytest.raises(ValueError, match="Demand counts must be non-negative"):
            demands = [
                DemandEntry(shift_id="shift1", day_of_week=0, count=-1)
            ]  # Negative count
            weeks_data = [TemplateWeekData(week_number=0, demands=demands)]
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

    def test_create_template_from_demands(self):
        """Test creating template from existing shift demands."""
        # Create sample shift demands (starting on a Monday - 2023-01-02)
        shift_demands = [
            {"date": "2023-01-02", "shift_id": "shift1", "count": 2},  # Monday
            {
                "date": "2023-01-03",
                "shift_id": "shift1",
                "count": 3,
            },  # Tuesday
            {
                "date": "2023-01-04",
                "shift_id": "shift1",
                "count": 2,
            },  # Wednesday
            {
                "date": "2023-01-05",
                "shift_id": "shift1",
                "count": 2,
            },  # Thursday
            {"date": "2023-01-06", "shift_id": "shift1", "count": 3},  # Friday
            {
                "date": "2023-01-09",
                "shift_id": "shift1",
                "count": 1,
            },  # Next Monday (week 1)
            {
                "date": "2023-01-10",
                "shift_id": "shift1",
                "count": 2,
            },  # Tuesday (week 1)
        ]

        template = create_template_from_demands(
            name="From Demands",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            shift_demands=shift_demands,
            created_by="user1",
        )

        assert template.name == "From Demands"
        assert template.team_id == "team1"
        assert template.template_type == TemplateType.STANDARD
        assert len(template.weeks_data) == 2  # Two weeks

        # Check week 0 data
        week0 = template.weeks_data[0]
        assert week0.week_number == 0

        # Check that we have the right demands for week 0 (should have 5 entries
        # for Mon-Fri)
        week0_demands = week0.demands
        assert len(week0_demands) == 5

        # Check specific demand entries
        monday_demand = next(d for d in week0_demands if d.day_of_week == 0)  # Monday
        assert monday_demand.shift_id == "shift1"
        assert monday_demand.count == 2

        tuesday_demand = next(d for d in week0_demands if d.day_of_week == 1)  # Tuesday
        assert tuesday_demand.shift_id == "shift1"
        assert tuesday_demand.count == 3

        # Check week 1 data
        week1 = template.weeks_data[1]
        assert week1.week_number == 1
        week1_demands = week1.demands
        assert len(week1_demands) == 2  # Monday and Tuesday of week 1

        # Check Monday and Tuesday of week 1
        monday_week1 = next(d for d in week1_demands if d.day_of_week == 0)
        assert monday_week1.count == 1

        tuesday_week1 = next(d for d in week1_demands if d.day_of_week == 1)
        assert tuesday_week1.count == 2

    def test_create_template_from_demands_with_timestamps(self):
        """Test creating template from demands with timestamp dates."""
        # Use timestamp format
        base_date = datetime(2023, 1, 2, tzinfo=timezone.utc)  # Monday
        shift_demands = [
            {"date": base_date.timestamp(), "shift_id": "shift1", "count": 2},
            {
                "date": (base_date.timestamp() + 86400),
                "shift_id": "shift1",
                "count": 3,
            },  # +1 day
        ]

        template = create_template_from_demands(
            name="From Timestamps",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            shift_demands=shift_demands,
            created_by="user1",
        )

        assert len(template.weeks_data) == 1
        week0 = template.weeks_data[0]
        week0_demands = week0.demands

        # Should have 2 demand entries
        assert len(week0_demands) == 2

        # Check Monday (day 0)
        monday_demand = next(d for d in week0_demands if d.day_of_week == 0)
        assert monday_demand.count == 2

        # Check Tuesday (day 1)
        tuesday_demand = next(d for d in week0_demands if d.day_of_week == 1)
        assert tuesday_demand.count == 3

    def test_template_update_timestamp(self):
        """Test timestamp update functionality."""
        demands = [DemandEntry(shift_id="shift1", day_of_week=0, count=2)]
        weeks_data = [TemplateWeekData(week_number=0, demands=demands)]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
        )

        initial_updated_at = template.updated_at
        # Small delay to ensure timestamp difference

        time.sleep(0.01)
        template.update_timestamp()

        assert template.updated_at > initial_updated_at

    def test_to_dict_and_from_dict(self):
        """Test serialization and deserialization."""
        demands = [
            DemandEntry(shift_id="shift1", day_of_week=0, count=2),
            DemandEntry(shift_id="shift1", day_of_week=1, count=3),
        ]
        weeks_data = [TemplateWeekData(week_number=0, demands=demands)]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
            description="Test description",
        )

        # Test to_dict
        template_dict = template.to_dict()
        assert template_dict["name"] == "Test Template"
        assert template_dict["team_id"] == "team1"
        assert template_dict["template_type"] == "standard"
        assert len(template_dict["weeks_data"]) == 1
        assert template_dict["weeks_data"][0]["week_number"] == 0
        assert len(template_dict["weeks_data"][0]["demands"]) == 2

        # Test from_dict
        template_from_dict = ShiftDemandTemplate.from_dict(template_dict)
        assert template_from_dict.name == "Test Template"
        assert template_from_dict.team_id == "team1"
        assert template_from_dict.template_type == TemplateType.STANDARD
        assert len(template_from_dict.weeks_data) == 1
        assert len(template_from_dict.weeks_data[0].demands) == 2
        assert isinstance(template_from_dict.weeks_data[0].demands[0], DemandEntry)

        # Check that demand entries are correctly deserialized
        first_demand = template_from_dict.weeks_data[0].demands[0]
        assert first_demand.shift_id == "shift1"
        assert first_demand.day_of_week == 0
        assert first_demand.count == 2
