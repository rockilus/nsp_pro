#!/usr/bin/env python3
"""
Simple test script to verify the template application logic works correctly.
"""

# import sys
from datetime import date

from shared.schemas.core.shift_demand_template import (
    DemandEntry,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
    apply_template_to_date_range,
)

# sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")


def test_standard_template_application():
    """Test applying a standard template to a date range."""
    print("Testing standard template application...")

    # Create a simple 2-week standard template
    week1_demands = [
        DemandEntry(shift_id="shift1", day_of_week=0, count=2),  # Monday
        DemandEntry(shift_id="shift1", day_of_week=1, count=1),  # Tuesday
    ]
    week2_demands = [
        DemandEntry(shift_id="shift1", day_of_week=0, count=3),  # Monday
        DemandEntry(shift_id="shift1", day_of_week=2, count=1),  # Wednesday
    ]

    template = ShiftDemandTemplate(
        name="Test Template",
        team_id="team123",
        template_type=TemplateType.STANDARD,
        weeks_data=[
            TemplateWeekData(week_number=0, demands=week1_demands),
            TemplateWeekData(week_number=1, demands=week2_demands),
        ],
        created_by="user123",
    )

    # Apply template to a 5-day period starting on a Monday
    start_date = date(2025, 6, 23)  # Monday
    end_date = date(2025, 6, 27)  # Friday

    demands = apply_template_to_date_range(template, start_date, end_date, "team123")

    print(f"Generated {len(demands)} demands:")
    for demand in demands:
        print(f"  {demand['date']}: shift {demand['shift_id']} count {demand['count']}")

    # Expected:
    # Mon 23rd: shift1 count 2 (week 0, day 0)
    # Tue 24th: shift1 count 1 (week 0, day 1)
    # Wed 25th: nothing (week 0, day 2 - no demands)
    # Thu 26th: nothing (week 0, day 3 - no demands)
    # Fri 27th: nothing (week 0, day 4 - no demands)

    assert len(demands) == 2, f"Expected 2 demands, got {len(demands)}"
    assert demands[0]["date"] == date(2025, 6, 23) and demands[0]["count"] == 2
    assert demands[1]["date"] == date(2025, 6, 24) and demands[1]["count"] == 1
    print("✓ Standard template test passed!")


def test_even_odd_template_application():
    """Test applying an even/odd template to a date range."""
    print("\nTesting even/odd template application...")

    # Create an even/odd template
    even_week_demands = [
        DemandEntry(shift_id="shift1", day_of_week=0, count=2),  # Monday
    ]
    odd_week_demands = [
        DemandEntry(shift_id="shift1", day_of_week=0, count=4),  # Monday
    ]

    template = ShiftDemandTemplate(
        name="Even/Odd Template",
        team_id="team123",
        template_type=TemplateType.EVEN_ODD,
        weeks_data=[
            TemplateWeekData(week_number=0, demands=even_week_demands),  # Even week
            TemplateWeekData(week_number=1, demands=odd_week_demands),  # Odd week
        ],
        created_by="user123",
    )

    # Apply template to a 14-day period (2 weeks) starting on a Monday
    start_date = date(2025, 6, 23)  # Monday
    end_date = date(2025, 7, 6)  # Sunday (2 weeks)

    demands = apply_template_to_date_range(template, start_date, end_date, "team123")

    print(f"Generated {len(demands)} demands:")
    for demand in demands:
        print(f"  {demand['date']}: shift {demand['shift_id']} count {demand['count']}")

    # Should generate demands for Mondays with alternating counts
    assert len(demands) == 2, f"Expected 2 demands, got {len(demands)}"
    print("✓ Even/odd template test passed!")


if __name__ == "__main__":
    test_standard_template_application()
    test_even_odd_template_application()
    print("\n🎉 All tests passed!")
