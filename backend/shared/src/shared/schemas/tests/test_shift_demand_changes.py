#!/usr/bin/env python3
"""
Quick test script to verify shift demand template changes work correctly.
"""

import sys

from shared.schemas.core.shift_demand_template import (
    DemandEntry,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)
from shared.schemas.dto.shift_demand_template import (
    DemandEntryDTO,
    ShiftDemandTemplateCreateDTO,
    TemplateWeekDataDTO,
)

# sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")


def test_demand_entry():
    """Test DemandEntry creation and serialization."""
    print("Testing DemandEntry...")

    # Create a demand entry
    entry = DemandEntry(shift_id="shift_1", day_of_week=0, count=2)  # Monday

    # Test to_dict
    entry_dict = entry.to_dict()
    expected = {"shift_id": "shift_1", "day_of_week": 0, "count": 2}
    assert entry_dict == expected, f"Expected {expected}, got {entry_dict}"

    # Test from_dict
    entry_from_dict = DemandEntry.from_dict(entry_dict)
    assert entry_from_dict.shift_id == "shift_1"
    assert entry_from_dict.day_of_week == 0
    assert entry_from_dict.count == 2

    print("✓ DemandEntry tests passed")


def test_template_week_data():
    """Test TemplateWeekData with new demand structure."""
    print("Testing TemplateWeekData...")

    # Create demand entries
    demands = [
        DemandEntry(shift_id="shift_1", day_of_week=0, count=2),
        DemandEntry(shift_id="shift_1", day_of_week=1, count=1),
        DemandEntry(shift_id="shift_2", day_of_week=0, count=3),
    ]

    # Create week data
    week_data = TemplateWeekData(week_number=0, demands=demands)

    # Test to_dict
    week_dict = week_data.to_dict()
    assert week_dict["week_number"] == 0
    assert len(week_dict["demands"]) == 3
    assert week_dict["demands"][0]["shift_id"] == "shift_1"

    # Test from_dict
    week_from_dict = TemplateWeekData.from_dict(week_dict)
    assert week_from_dict.week_number == 0
    assert len(week_from_dict.demands) == 3
    assert isinstance(week_from_dict.demands[0], DemandEntry)

    print("✓ TemplateWeekData tests passed")


def test_dto():
    """Test DTO structure."""
    print("Testing DTOs...")

    # Test DemandEntryDTO
    demand_dto = DemandEntryDTO(shiftId="shift_1", dayOfWeek=0, count=2)
    assert demand_dto.shiftId == "shift_1"
    assert demand_dto.dayOfWeek == 0
    assert demand_dto.count == 2

    # Test TemplateWeekDataDTO
    week_dto = TemplateWeekDataDTO(weekNumber=0, demands=[demand_dto])
    assert week_dto.weekNumber == 0
    assert len(week_dto.demands) == 1

    # Test simplified CreateDTO
    create_dto = ShiftDemandTemplateCreateDTO(
        name="Test Template", description="A test template"
    )
    assert create_dto.name == "Test Template"
    assert create_dto.description == "A test template"

    print("✓ DTO tests passed")


def test_full_template():
    """Test complete template creation."""
    print("Testing full template creation...")

    # Create demands
    demands = [
        DemandEntry(shift_id="morning", day_of_week=0, count=2),
        DemandEntry(shift_id="morning", day_of_week=1, count=2),
        DemandEntry(shift_id="evening", day_of_week=0, count=1),
    ]

    # Create week data
    week_data = TemplateWeekData(week_number=0, demands=demands)

    # Create template
    template = ShiftDemandTemplate(
        name="Test Template",
        team_id="team_1",
        template_type=TemplateType.STANDARD,
        weeks_data=[week_data],
        description="Test description",
        created_by="user_1",
    )

    assert template.name == "Test Template"
    assert template.week_count == 1
    assert len(template.weeks_data[0].demands) == 3

    # Test to_dict
    template_dict = template.to_dict()
    assert template_dict["name"] == "Test Template"
    assert template_dict["template_type"] == "standard"
    assert len(template_dict["weeks_data"]) == 1

    # Test from_dict
    template_from_dict = ShiftDemandTemplate.from_dict(template_dict)
    assert template_from_dict.name == "Test Template"
    assert isinstance(template_from_dict.weeks_data[0].demands[0], DemandEntry)

    print("✓ Full template tests passed")


if __name__ == "__main__":
    try:
        test_demand_entry()
        test_template_week_data()
        test_dto()
        test_full_template()
        print(
            "\n🎉 All tests passed! The shift demand template changes are "
            "working correctly."
        )
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
