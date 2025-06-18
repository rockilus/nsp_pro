"""
Tests for shift demand template core domain models with updated structure.
"""

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
    """Test the core domain logic for shift demand templates."""

    def test_template_creation_basic(self):
        """Test basic template creation."""
        weeks_data = [
            TemplateWeekData(
                week_number=0,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=2),
                    DemandEntry(shift_id="shift1", day_of_week=1, count=3),
                    DemandEntry(shift_id="shift1", day_of_week=2, count=2),
                    DemandEntry(shift_id="shift1", day_of_week=3, count=2),
                    DemandEntry(shift_id="shift1", day_of_week=4, count=3),
                ],
            )
        ]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
        )

        assert template.name == "Test Template"
        assert template.team_id == "team1"
        assert template.template_type == TemplateType.STANDARD
        assert len(template.weeks_data) == 1
        assert template.week_count == 1

    def test_template_validation_errors(self):
        """Test validation of template data."""
        weeks_data = [
            TemplateWeekData(
                week_number=0,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=2),
                ],
            )
        ]

        # Empty name
        with pytest.raises(ValueError, match="Template name is required"):
            ShiftDemandTemplate(
                name="",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # No weeks data
        with pytest.raises(ValueError, match="Template must have at least one week"):
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=[],
                created_by="user1",
            )

    def test_even_odd_template_validation(self):
        """Test validation for even/odd templates."""
        # Even/odd must have exactly 2 weeks
        weeks_data = [
            TemplateWeekData(
                week_number=0,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=2),
                ],
            )
        ]

        with pytest.raises(
            ValueError, match="Even/odd templates must have exactly 2 weeks"
        ):
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.EVEN_ODD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Valid even/odd template
        weeks_data.append(
            TemplateWeekData(
                week_number=1,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=1),
                ],
            )
        )

        template = ShiftDemandTemplate(
            name="Test",
            team_id="team1",
            template_type=TemplateType.EVEN_ODD,
            weeks_data=weeks_data,
            created_by="user1",
        )

        assert template.week_count == 2

    def test_demand_data_validation(self):
        """Test validation of demand data structure."""
        # Invalid day of week (too high)
        with pytest.raises(ValueError, match="Day of week must be between 0 and 6"):
            weeks_data = [
                TemplateWeekData(
                    week_number=0,
                    demands=[
                        DemandEntry(shift_id="shift1", day_of_week=7, count=2),
                    ],
                )
            ]
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Invalid day of week (negative)
        with pytest.raises(ValueError, match="Day of week must be between 0 and 6"):
            weeks_data = [
                TemplateWeekData(
                    week_number=0,
                    demands=[
                        DemandEntry(shift_id="shift1", day_of_week=-1, count=2),
                    ],
                )
            ]
            ShiftDemandTemplate(
                name="Test",
                team_id="team1",
                template_type=TemplateType.STANDARD,
                weeks_data=weeks_data,
                created_by="user1",
            )

        # Negative demand count
        with pytest.raises(ValueError, match="Demand counts must be non-negative"):
            weeks_data = [
                TemplateWeekData(
                    week_number=0,
                    demands=[
                        DemandEntry(shift_id="shift1", day_of_week=0, count=-1),
                    ],
                )
            ]
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
            },  # Next Monday
            {
                "date": "2023-01-10",
                "shift_id": "shift1",
                "count": 2,
            },  # Tuesday
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

        # Find demands for each day of week
        week0_demands = {
            entry.day_of_week: entry.count
            for entry in week0.demands
            if entry.shift_id == "shift1"
        }
        expected_week0 = {0: 2, 1: 3, 2: 2, 3: 2, 4: 3}  # Mon-Fri
        assert week0_demands == expected_week0

        # Check week 1 data
        week1 = template.weeks_data[1]
        assert week1.week_number == 1

        week1_demands = {
            entry.day_of_week: entry.count
            for entry in week1.demands
            if entry.shift_id == "shift1"
        }
        expected_week1 = {0: 1, 1: 2}  # Mon-Tue
        assert week1_demands == expected_week1

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

        week0_demands = {
            entry.day_of_week: entry.count
            for entry in week0.demands
            if entry.shift_id == "shift1"
        }
        expected = {0: 2, 1: 3}  # Mon-Tue
        assert week0_demands == expected

    def test_template_update_timestamp(self):
        """Test timestamp update functionality."""
        weeks_data = [
            TemplateWeekData(
                week_number=0,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=2),
                ],
            )
        ]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
        )

        original_updated = template.updated_at
        template.update_timestamp()

        assert template.updated_at > original_updated

    def test_to_dict_and_from_dict(self):
        """Test serialization and deserialization."""
        weeks_data = [
            TemplateWeekData(
                week_number=0,
                demands=[
                    DemandEntry(shift_id="shift1", day_of_week=0, count=2),
                    DemandEntry(shift_id="shift1", day_of_week=1, count=3),
                ],
            )
        ]

        template = ShiftDemandTemplate(
            name="Test Template",
            team_id="team1",
            template_type=TemplateType.STANDARD,
            weeks_data=weeks_data,
            created_by="user1",
            description="Test description",
        )

        # Convert to dict
        template_dict = template.to_dict()

        assert template_dict["name"] == "Test Template"
        assert template_dict["template_type"] == "standard"
        assert isinstance(template_dict["created_at"], float)
        assert len(template_dict["weeks_data"]) == 1

        # Convert back from dict
        restored_template = ShiftDemandTemplate.from_dict(template_dict)

        assert restored_template.name == template.name
        assert restored_template.team_id == template.team_id
        assert restored_template.template_type == template.template_type
        assert len(restored_template.weeks_data) == 1

        # Check that demand entries are correctly restored
        original_demands = weeks_data[0].demands
        restored_demands = restored_template.weeks_data[0].demands

        assert len(original_demands) == len(restored_demands)
        for orig, restored in zip(original_demands, restored_demands):
            assert orig.shift_id == restored.shift_id
            assert orig.day_of_week == restored.day_of_week
            assert orig.count == restored.count
