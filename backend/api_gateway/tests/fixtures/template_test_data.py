"""
Test fixtures and data for shift demand template tests.
Following NSP Pro security and production best practices.
"""

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from shared.schemas.core import (
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)
from shared.schemas.core.shift_demand_template import DemandEntry


class TemplateTestFixtures:
    """Secure test fixtures for template testing."""

    @staticmethod
    def create_standard_template() -> ShiftDemandTemplate:
        """Create test data for standard template - sanitized for security."""
        # Create demand entries using the new structure
        demands = [
            # Morning shift demands - Mon-Fri: 2 people, Weekends: 0
            DemandEntry(shift_id="morning_shift_001", day_of_week=0, count=2),  # Monday
            DemandEntry(
                shift_id="morning_shift_001", day_of_week=1, count=2
            ),  # Tuesday
            DemandEntry(
                shift_id="morning_shift_001", day_of_week=2, count=2
            ),  # Wednesday
            DemandEntry(
                shift_id="morning_shift_001", day_of_week=3, count=2
            ),  # Thursday
            DemandEntry(shift_id="morning_shift_001", day_of_week=4, count=2),  # Friday
            # Evening shift demands - Every day: 1 person
            DemandEntry(shift_id="evening_shift_001", day_of_week=0, count=1),  # Monday
            DemandEntry(
                shift_id="evening_shift_001", day_of_week=1, count=1
            ),  # Tuesday
            DemandEntry(
                shift_id="evening_shift_001", day_of_week=2, count=1
            ),  # Wednesday
            DemandEntry(
                shift_id="evening_shift_001", day_of_week=3, count=1
            ),  # Thursday
            DemandEntry(shift_id="evening_shift_001", day_of_week=4, count=1),  # Friday
            DemandEntry(
                shift_id="evening_shift_001", day_of_week=5, count=1
            ),  # Saturday
            DemandEntry(shift_id="evening_shift_001", day_of_week=6, count=1),  # Sunday
            # Night shift demands - Mon-Fri: 1 person, Weekends: 0
            DemandEntry(shift_id="night_shift_001", day_of_week=0, count=1),  # Monday
            DemandEntry(shift_id="night_shift_001", day_of_week=1, count=1),  # Tuesday
            DemandEntry(
                shift_id="night_shift_001", day_of_week=2, count=1
            ),  # Wednesday
            DemandEntry(shift_id="night_shift_001", day_of_week=3, count=1),  # Thursday
            DemandEntry(shift_id="night_shift_001", day_of_week=4, count=1),  # Friday
        ]

        return ShiftDemandTemplate(
            id="test_template_std_001",
            team_id="test_team_secure_123",  # Anonymized test data
            name="Test Standard Template",
            template_type=TemplateType.STANDARD,
            weeks_data=[
                TemplateWeekData(
                    week_number=0,
                    demands=demands,
                )
            ],
            description="Test template for healthcare shift scheduling",
            created_by="test_user_secure",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def create_even_odd_template() -> ShiftDemandTemplate:
        """Create test data for even/odd template."""
        # Week 1 demands (higher staffing)
        week1_demands = [
            # ICU shift - Week 1: Higher staffing
            DemandEntry(shift_id="icu_shift_001", day_of_week=0, count=3),  # Monday
            DemandEntry(shift_id="icu_shift_001", day_of_week=1, count=3),  # Tuesday
            DemandEntry(shift_id="icu_shift_001", day_of_week=2, count=3),  # Wednesday
            DemandEntry(shift_id="icu_shift_001", day_of_week=3, count=3),  # Thursday
            DemandEntry(shift_id="icu_shift_001", day_of_week=4, count=3),  # Friday
            DemandEntry(shift_id="icu_shift_001", day_of_week=5, count=2),  # Saturday
            DemandEntry(shift_id="icu_shift_001", day_of_week=6, count=2),  # Sunday
            # ER shift - Week 1
            DemandEntry(shift_id="er_shift_001", day_of_week=0, count=2),  # Monday
            DemandEntry(shift_id="er_shift_001", day_of_week=1, count=2),  # Tuesday
            DemandEntry(shift_id="er_shift_001", day_of_week=2, count=2),  # Wednesday
            DemandEntry(shift_id="er_shift_001", day_of_week=3, count=2),  # Thursday
            DemandEntry(shift_id="er_shift_001", day_of_week=4, count=2),  # Friday
            DemandEntry(shift_id="er_shift_001", day_of_week=5, count=1),  # Saturday
            DemandEntry(shift_id="er_shift_001", day_of_week=6, count=1),  # Sunday
        ]

        # Week 2 demands (lower staffing)
        week2_demands = [
            # ICU shift - Week 2: Lower staffing
            DemandEntry(shift_id="icu_shift_001", day_of_week=0, count=2),  # Monday
            DemandEntry(shift_id="icu_shift_001", day_of_week=1, count=2),  # Tuesday
            DemandEntry(shift_id="icu_shift_001", day_of_week=2, count=2),  # Wednesday
            DemandEntry(shift_id="icu_shift_001", day_of_week=3, count=2),  # Thursday
            DemandEntry(shift_id="icu_shift_001", day_of_week=4, count=2),  # Friday
            DemandEntry(shift_id="icu_shift_001", day_of_week=5, count=1),  # Saturday
            DemandEntry(shift_id="icu_shift_001", day_of_week=6, count=1),  # Sunday
            # ER shift - Week 2
            DemandEntry(shift_id="er_shift_001", day_of_week=0, count=1),  # Monday
            DemandEntry(shift_id="er_shift_001", day_of_week=1, count=1),  # Tuesday
            DemandEntry(shift_id="er_shift_001", day_of_week=2, count=1),  # Wednesday
            DemandEntry(shift_id="er_shift_001", day_of_week=3, count=1),  # Thursday
            DemandEntry(shift_id="er_shift_001", day_of_week=4, count=1),  # Friday
            DemandEntry(shift_id="er_shift_001", day_of_week=5, count=1),  # Saturday
            DemandEntry(shift_id="er_shift_001", day_of_week=6, count=1),  # Sunday
        ]

        return ShiftDemandTemplate(
            id="test_template_eo_001",
            team_id="test_team_secure_123",
            name="Test Even/Odd Template",
            template_type=TemplateType.EVEN_ODD,
            weeks_data=[
                TemplateWeekData(
                    week_number=0,
                    demands=week1_demands,
                ),
                TemplateWeekData(
                    week_number=1,
                    demands=week2_demands,
                ),
            ],
            description="Even/odd pattern for alternating healthcare coverage",
            created_by="test_user_secure",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def create_multi_week_template() -> ShiftDemandTemplate:
        """Create test template with multiple weeks for complex patterns."""
        # Week 1 demands (high staffing)
        week1_demands = [
            DemandEntry(shift_id="shift_001", day_of_week=0, count=3),  # Monday
            DemandEntry(shift_id="shift_001", day_of_week=1, count=3),  # Tuesday
            DemandEntry(shift_id="shift_001", day_of_week=2, count=3),  # Wednesday
            DemandEntry(shift_id="shift_001", day_of_week=3, count=3),  # Thursday
            DemandEntry(shift_id="shift_001", day_of_week=4, count=3),  # Friday
        ]

        # Week 2 demands (medium staffing)
        week2_demands = [
            DemandEntry(shift_id="shift_001", day_of_week=0, count=2),  # Monday
            DemandEntry(shift_id="shift_001", day_of_week=1, count=2),  # Tuesday
            DemandEntry(shift_id="shift_001", day_of_week=2, count=2),  # Wednesday
            DemandEntry(shift_id="shift_001", day_of_week=3, count=2),  # Thursday
            DemandEntry(shift_id="shift_001", day_of_week=4, count=2),  # Friday
        ]

        # Week 3 demands (low staffing)
        week3_demands = [
            DemandEntry(shift_id="shift_001", day_of_week=0, count=1),  # Monday
            DemandEntry(shift_id="shift_001", day_of_week=1, count=1),  # Tuesday
            DemandEntry(shift_id="shift_001", day_of_week=2, count=1),  # Wednesday
            DemandEntry(shift_id="shift_001", day_of_week=3, count=1),  # Thursday
            DemandEntry(shift_id="shift_001", day_of_week=4, count=1),  # Friday
        ]

        return ShiftDemandTemplate(
            id="test_template_multi_001",
            team_id="test_team_secure_123",
            name="Multi-Week Test Template",
            template_type=TemplateType.STANDARD,
            weeks_data=[
                TemplateWeekData(week_number=0, demands=week1_demands),
                TemplateWeekData(week_number=1, demands=week2_demands),
                TemplateWeekData(week_number=2, demands=week3_demands),
            ],
            description="Multi-week rotating pattern for specialized care units",
            created_by="test_user_secure",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def create_template_for_different_team() -> ShiftDemandTemplate:
        """Create template for security testing - different team ownership."""
        template = TemplateTestFixtures.create_standard_template()
        template.id = "test_template_other_team"
        template.team_id = "different_team_456"  # Different team for security tests
        template.name = "Other Team Template"
        return template

    @staticmethod
    def create_invalid_even_odd_template() -> ShiftDemandTemplate:
        """Create invalid even/odd template for error testing."""
        template = TemplateTestFixtures.create_standard_template()
        template.id = "test_template_invalid_eo"
        template.template_type = TemplateType.EVEN_ODD
        # Keep only 1 week (invalid for even/odd)
        return template

    @staticmethod
    def create_empty_template() -> ShiftDemandTemplate:
        """Create template with no weeks for error testing."""
        template = TemplateTestFixtures.create_standard_template()
        template.id = "test_template_empty"
        template.weeks_data = []  # Empty weeks
        return template


class MockServiceFactory:
    """Factory for creating mock services with secure defaults."""

    @staticmethod
    def create_template_service() -> AsyncMock:
        """Create mock template service with secure defaults."""
        service = AsyncMock()
        # Set secure defaults that prevent information leakage
        service.get_template_by_id.return_value = None
        service.get_templates_by_team.return_value = []
        return service

    @staticmethod
    def create_demand_service() -> MagicMock:
        """Create mock demand service with secure defaults."""
        service = MagicMock()
        service.delete_demands_by_date_range.return_value = 0

        # Mock bulk_upsert to return the demands that were passed in
        def mock_bulk_upsert(demands):
            return demands, []  # Return created demands and empty conflicts

        service.bulk_upsert_shift_demands.side_effect = mock_bulk_upsert
        return service


class TestDateRanges:  # pylint: disable=too-few-public-methods
    """Standard date ranges for consistent testing."""

    # Single week periods
    MONDAY_TO_SUNDAY = (date(2024, 1, 1), date(2024, 1, 7))  # Week 1 of 2024
    WEEK_2 = (date(2024, 1, 8), date(2024, 1, 14))  # Week 2 of 2024

    # Multi-week periods
    TWO_WEEKS = (date(2024, 1, 1), date(2024, 1, 14))  # Weeks 1-2
    THREE_WEEKS = (date(2024, 1, 1), date(2024, 1, 21))  # Weeks 1-3
    FOUR_WEEKS = (date(2024, 1, 1), date(2024, 1, 28))  # Weeks 1-4

    # Partial weeks
    PARTIAL_WEEK_START = (date(2024, 1, 3), date(2024, 1, 7))  # Wed-Sun
    PARTIAL_WEEK_END = (date(2024, 1, 1), date(2024, 1, 5))  # Mon-Fri

    # Edge cases
    SINGLE_DAY = (date(2024, 1, 1), date(2024, 1, 1))  # Single day
    INVALID_RANGE = (date(2024, 1, 7), date(2024, 1, 1))  # End before start


class SecurityTestData:  # pylint: disable=too-few-public-methods
    """Data for security-focused testing."""

    VALID_TEAM_ID = "test_team_secure_123"
    INVALID_TEAM_ID = "unauthorized_team_456"
    MALICIOUS_TEAM_ID = "../../../etc/passwd"

    VALID_TEMPLATE_ID = "test_template_std_001"
    NONEXISTENT_TEMPLATE_ID = "nonexistent_template_999"
    MALICIOUS_TEMPLATE_ID = "<script>alert('xss')</script>"

    VALID_USER_ID = "test_user_secure"
    UNAUTHORIZED_USER_ID = "unauthorized_user"


# Pytest fixtures for easy test integration
@pytest.fixture
def standard_template():
    """Fixture providing standard template."""
    return TemplateTestFixtures.create_standard_template()


@pytest.fixture
def even_odd_template():
    """Fixture providing even/odd template."""
    return TemplateTestFixtures.create_even_odd_template()


@pytest.fixture
def multi_week_template():
    """Fixture providing multi-week template."""
    return TemplateTestFixtures.create_multi_week_template()


@pytest.fixture
def mock_template_service():
    """Fixture providing mock template service."""
    return MockServiceFactory.create_template_service()


@pytest.fixture
def mock_demand_service():
    """Fixture providing mock demand service."""
    return MockServiceFactory.create_demand_service()


@pytest.fixture
def secure_test_data():
    """Fixture providing security test data."""
    return SecurityTestData()
