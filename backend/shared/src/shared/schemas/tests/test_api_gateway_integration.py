#!/usr/bin/env python3
"""
Test script to verify the API gateway template application integration.
"""

# import sys
from datetime import date, datetime, timezone

from shared.schemas.core.shift_demand_template import (
    DemandEntry,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
    apply_template_to_date_range,
)
from shared.schemas.dto.shift_demand_template import (
    ApplyTemplateToDateRangeDTO,
    TemplateApplicationResult,
)

# sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")
# sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/api_gateway/src")


def test_dto_creation():
    """Test that DTOs can be created correctly."""
    print("Testing DTO creation...")

    # Test ApplyTemplateToDateRangeDTO
    start_timestamp = datetime(2025, 6, 23, tzinfo=timezone.utc).timestamp()
    end_timestamp = datetime(2025, 6, 29, tzinfo=timezone.utc).timestamp()

    apply_dto = ApplyTemplateToDateRangeDTO(
        templateId="template123",
        startDate=start_timestamp,
        endDate=end_timestamp,
        overwriteExisting=True,
    )

    assert apply_dto.templateId == "template123"
    assert apply_dto.overwriteExisting is True
    print("✓ ApplyTemplateToDateRangeDTO creation works")

    # Test TemplateApplicationResult
    result = TemplateApplicationResult(
        success=True,
        demandsCreated=5,
        demandsUpdated=2,
        demandsDeleted=1,
        message="Test message",
    )

    assert result.success is True
    assert result.demandsCreated == 5
    print("✓ TemplateApplicationResult creation works")


def test_integration_flow():
    """Test the full integration flow."""
    print("\nTesting integration flow...")

    # Create a test template
    week1_demands = [
        DemandEntry(shift_id="shift1", day_of_week=0, count=2),  # Monday
        DemandEntry(shift_id="shift2", day_of_week=2, count=1),  # Wednesday
    ]

    template = ShiftDemandTemplate(
        name="Test Integration Template",
        team_id="team123",
        template_type=TemplateType.STANDARD,
        weeks_data=[
            TemplateWeekData(week_number=0, demands=week1_demands),
        ],
        created_by="user123",
    )

    # Apply template to a date range
    start_date = date(2025, 6, 23)  # Monday
    end_date = date(2025, 6, 27)  # Friday

    demands = apply_template_to_date_range(template, start_date, end_date, "team123")

    print(f"Generated {len(demands)} demands:")
    for demand in demands:
        print(f"  {demand['date']}: shift {demand['shift_id']} count {demand['count']}")

    # Verify we got the expected demands
    assert len(demands) == 2, f"Expected 2 demands, got {len(demands)}"

    # Check Monday demand
    monday_demands = [d for d in demands if d["date"] == date(2025, 6, 23)]
    assert len(monday_demands) == 1
    assert monday_demands[0]["shift_id"] == "shift1"
    assert monday_demands[0]["count"] == 2

    # Check Wednesday demand
    wednesday_demands = [d for d in demands if d["date"] == date(2025, 6, 25)]
    assert len(wednesday_demands) == 1
    assert wednesday_demands[0]["shift_id"] == "shift2"
    assert wednesday_demands[0]["count"] == 1

    print("✓ Integration flow test passed!")


if __name__ == "__main__":
    test_dto_creation()
    test_integration_flow()
    print("\n🎉 All integration tests passed!")
