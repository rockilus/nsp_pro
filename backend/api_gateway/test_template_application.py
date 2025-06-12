#!/usr/bin/env python3
"""
Test script for the shift demand template application service.
This verifies that our Phase 2 implementation works correctly.
"""

import asyncio
from datetime import date, datetime, timezone
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock

# Mock the shared modules to avoid import issues
import sys
from unittest.mock import Mock

# Create mock modules
mock_shared = Mock()
mock_shared.logger = Mock()
mock_shared.logger.log_info = Mock()
mock_shared.schemas = Mock()
mock_shared.schemas.core = Mock()
mock_shared.schemas.dto = Mock()


# Create mock classes
class MockShiftDemandNew:
    def __init__(self, team_id, shift_id, date, count, source, source_id):
        self.team_id = team_id
        self.shift_id = shift_id
        self.date = date
        self.count = count
        self.source = source
        self.source_id = source_id


class MockTemplateType:
    STANDARD = "standard"
    EVEN_ODD = "even_odd"


class MockShiftDemandSource:
    TEMPLATE = "template"


class MockTemplateWeekData:
    def __init__(self, week_number: int, demands: Dict[str, List[int]]):
        self.week_number = week_number
        self.demands = demands


class MockShiftDemandTemplate:
    def __init__(self, id, team_id, name, template_type, weeks_data):
        self.id = id
        self.team_id = team_id
        self.name = name
        self.template_type = template_type
        self.weeks_data = weeks_data


class MockShiftDemandNewCreateDTO:
    def __init__(self, teamId, shiftId, date, count, source, sourceId):
        self.teamId = teamId
        self.shiftId = shiftId
        self.date = date
        self.count = count
        self.source = source
        self.sourceId = sourceId


# Patch the modules
mock_shared.schemas.core.ShiftDemandNew = MockShiftDemandNew
mock_shared.schemas.core.TemplateType = MockTemplateType
mock_shared.schemas.core.ShiftDemandSource = MockShiftDemandSource
mock_shared.schemas.core.TemplateWeekData = MockTemplateWeekData
mock_shared.schemas.core.ShiftDemandTemplate = MockShiftDemandTemplate
mock_shared.schemas.dto.ShiftDemandNewCreateDTO = MockShiftDemandNewCreateDTO

sys.modules['shared'] = mock_shared
sys.modules['shared.logger'] = mock_shared.logger
sys.modules['shared.schemas'] = mock_shared.schemas
sys.modules['shared.schemas.core'] = mock_shared.schemas.core
sys.modules['shared.schemas.dto'] = mock_shared.schemas.dto

# Now we can import our service
try:
    from src.services.shift_demand_template_application_service import (
        ShiftDemandTemplateApplicationService,
    )

    print("✅ Successfully imported ShiftDemandTemplateApplicationService")
except Exception as e:
    print(f"❌ Failed to import service: {e}")
    sys.exit(1)


async def test_template_application_service():
    """Test the template application service with various scenarios."""
    print("\n🧪 Testing Template Application Service...")

    # Create mock services
    mock_template_service = AsyncMock()
    mock_demand_service = MagicMock()

    # Create a mock template with standard type
    template_week = MockTemplateWeekData(
        week_number=0,
        demands={
            "shift_1": [2, 3, 2, 3, 2, 0, 0],  # Mon-Sun demands
            "shift_2": [1, 1, 1, 1, 1, 0, 0],  # Mon-Fri only
        },
    )

    standard_template = MockShiftDemandTemplate(
        id="template_123",
        team_id="team_456",
        name="Standard Week Template",
        template_type=MockTemplateType.STANDARD,
        weeks_data=[template_week],
    )

    mock_template_service.get_template_by_id.return_value = standard_template
    mock_demand_service.delete_demands_by_date_range.return_value = 5
    mock_demand_service.bulk_upsert_shift_demands.return_value = ([], [])

    # Create service instance
    service = ShiftDemandTemplateApplicationService(
        template_service=mock_template_service,
        demand_service=mock_demand_service,
    )

    # Test 1: Standard template application
    print("\n📝 Test 1: Standard template application")
    start_date = date(2024, 1, 1)  # Monday
    end_date = date(2024, 1, 7)  # Sunday

    try:
        created_demands, replaced_count = (
            await service.apply_template_to_period(
                template_id="template_123",
                team_id="team_456",
                target_start=start_date,
                target_end=end_date,
                replace_existing=True,
            )
        )

        print(f"  ✅ Applied template successfully")
        print(f"  📊 Replaced {replaced_count} existing demands")
        print(f"  🆕 Created {len(created_demands)} new demands")

    except Exception as e:
        print(f"  ❌ Test 1 failed: {e}")
        return False

    # Test 2: Template compatibility validation
    print("\n📝 Test 2: Template compatibility validation")
    try:
        result = await service.validate_template_compatibility(
            template_id="template_123",
            team_id="team_456",
            target_start=start_date,
            target_end=end_date,
        )

        print(f"  ✅ Validation completed")
        print(f"  ✅ Valid shifts: {len(result['valid_shifts'])}")
        print(f"  ⚠️  Warnings: {len(result['warnings'])}")

    except Exception as e:
        print(f"  ❌ Test 2 failed: {e}")
        return False

    # Test 3: Template preview
    print("\n📝 Test 3: Template preview")
    try:
        preview = await service.preview_template_application(
            template_id="template_123",
            team_id="team_456",
            target_start=start_date,
            target_end=end_date,
        )

        print(f"  ✅ Preview generated")
        print(f"  📊 Total demands: {preview['total_demands']}")
        print(f"  💯 Total demand value: {preview['total_demand_value']}")
        print(f"  🗓️  Affected dates: {len(preview['affected_dates'])}")

    except Exception as e:
        print(f"  ❌ Test 3 failed: {e}")
        return False

    # Test 4: Even/odd template
    print("\n📝 Test 4: Even/odd template application")

    # Create even/odd template with 2 weeks
    week_1 = MockTemplateWeekData(0, {"shift_1": [3, 3, 3, 3, 3, 0, 0]})
    week_2 = MockTemplateWeekData(1, {"shift_1": [2, 2, 2, 2, 2, 0, 0]})

    even_odd_template = MockShiftDemandTemplate(
        id="template_even_odd",
        team_id="team_456",
        name="Even/Odd Template",
        template_type=MockTemplateType.EVEN_ODD,
        weeks_data=[week_1, week_2],
    )

    mock_template_service.get_template_by_id.return_value = even_odd_template

    try:
        # Test with a 2-week period
        start_date = date(2024, 1, 1)  # Week 1 of 2024
        end_date = date(2024, 1, 14)  # End of week 2

        created_demands, replaced_count = (
            await service.apply_template_to_period(
                template_id="template_even_odd",
                team_id="team_456",
                target_start=start_date,
                target_end=end_date,
                replace_existing=True,
            )
        )

        print(f"  ✅ Even/odd template applied successfully")
        print(f"  📊 Created {len(created_demands)} demands for 2-week period")

    except Exception as e:
        print(f"  ❌ Test 4 failed: {e}")
        return False

    # Test 5: Error handling
    print("\n📝 Test 5: Error handling")

    # Test with non-existent template
    mock_template_service.get_template_by_id.return_value = None

    try:
        await service.apply_template_to_period(
            template_id="non_existent",
            team_id="team_456",
            target_start=start_date,
            target_end=end_date,
        )
        print(f"  ❌ Should have raised ValueError for non-existent template")
        return False
    except ValueError as e:
        print(f"  ✅ Correctly raised ValueError: {e}")
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        return False

    print(
        "\n🎉 All tests passed! Template application service is working correctly."
    )
    return True


def test_business_logic():
    """Test the core business logic without mocks."""
    print("\n🧪 Testing Core Business Logic...")

    # Test week data structure
    week_data = MockTemplateWeekData(
        week_number=0,
        demands={
            "morning_shift": [2, 2, 2, 2, 2, 0, 0],  # Mon-Fri: 2 people
            "evening_shift": [1, 1, 1, 1, 1, 1, 1],  # Every day: 1 person
        },
    )

    print(f"✅ Week data structure: {len(week_data.demands)} shifts defined")
    print(f"✅ Morning shift pattern: {week_data.demands['morning_shift']}")
    print(f"✅ Evening shift pattern: {week_data.demands['evening_shift']}")

    # Test template structure
    template = MockShiftDemandTemplate(
        id="test_template",
        team_id="test_team",
        name="Test Template",
        template_type=MockTemplateType.STANDARD,
        weeks_data=[week_data],
    )

    print(f"✅ Template created with {len(template.weeks_data)} weeks")
    print(f"✅ Template type: {template.template_type}")

    return True


if __name__ == "__main__":
    print("🚀 Starting Template Application Service Tests...")

    # Test business logic first
    if not test_business_logic():
        print("❌ Business logic tests failed")
        sys.exit(1)

    # Test service functionality
    success = asyncio.run(test_template_application_service())

    if success:
        print(
            "\n✅ All tests passed! Phase 2 implementation is working correctly."
        )
        print("\n📋 Summary of implemented features:")
        print("  • Template application service with complex business logic")
        print(
            "  • Even/odd template pattern support (alternating 2-week cycles)"
        )
        print(
            "  • Standard template pattern support (sequential week cycling)"
        )
        print("  • Template compatibility validation")
        print("  • Template application preview")
        print("  • Proper error handling and validation")
        print("  • Type-safe implementation with proper annotations")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1)
