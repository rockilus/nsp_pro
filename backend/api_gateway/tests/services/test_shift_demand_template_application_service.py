"""
Tests for the ShiftDemandTemplateApplicationService.

This module tests the complex business logic for applying templates to periods,
including even/odd template patterns and standard repetition logic.
"""

import pytest
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, Mock
from typing import List

from shared.schemas.core import (
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)

# Import the service under test
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../src'))

from services.shift_demand_template_application_service import (
    ShiftDemandTemplateApplicationService,
)


class TestShiftDemandTemplateApplicationService:
    """Test cases for ShiftDemandTemplateApplicationService."""

    @pytest.fixture
    def mock_template_service(self):
        """Mock template service for testing."""
        return AsyncMock()

    @pytest.fixture
    def mock_demand_service(self):
        """Mock demand service for testing."""
        return Mock()

    @pytest.fixture
    def application_service(self, mock_template_service, mock_demand_service):
        """Create application service with mocked dependencies."""
        return ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

    @pytest.fixture
    def sample_template(self):
        """Create a sample template for testing."""
        return ShiftDemandTemplate(
            id="template_123",
            name="Test Template",
            team_id="team_456",
            template_type=TemplateType.STANDARD,
            weeks_data=[
                TemplateWeekData(
                    week_number=0,
                    demands={
                        "shift_1": [2, 3, 2, 2, 3, 0, 0],  # Mon-Sun
                        "shift_2": [1, 1, 1, 1, 1, 0, 0],
                    },
                )
            ],
            description="Test template",
            created_by="user_789",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    @pytest.fixture
    def even_odd_template(self):
        """Create a sample even/odd template for testing."""
        return ShiftDemandTemplate(
            id="template_even_odd",
            name="Even/Odd Template",
            team_id="team_456",
            template_type=TemplateType.EVEN_ODD,
            weeks_data=[
                TemplateWeekData(
                    week_number=0,
                    demands={
                        "shift_1": [2, 2, 2, 2, 2, 0, 0],  # Week 1
                    },
                ),
                TemplateWeekData(
                    week_number=1,
                    demands={
                        "shift_1": [3, 3, 3, 3, 3, 0, 0],  # Week 2
                    },
                ),
            ],
            description="Even/odd test template",
            created_by="user_789",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    @pytest.mark.asyncio
    async def test_apply_template_to_period_standard(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
        sample_template,
    ):
        """Test applying a standard template to a period."""
        # Setup mocks
        mock_template_service.get_template_by_id.return_value = sample_template
        mock_demand_service.delete_demands_by_date_range.return_value = 0
        mock_demand_service.bulk_upsert_shift_demands.return_value = ([], [])

        # Test period
        target_start = date(2024, 1, 1)  # Monday
        target_end = date(2024, 1, 7)  # Sunday (1 week)

        # Apply template
        result = await application_service.apply_template_to_period(
            template_id=sample_template.id,
            team_id=sample_template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify template service was called
        mock_template_service.get_template_by_id.assert_called_once_with(
            sample_template.id
        )

        # Verify result structure
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert replaced_count == 0

    @pytest.mark.asyncio
    async def test_apply_even_odd_template(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
        even_odd_template,
    ):
        """Test applying an even/odd template."""
        # Setup mocks
        mock_template_service.get_template_by_id.return_value = (
            even_odd_template
        )
        mock_demand_service.delete_demands_by_date_range.return_value = 0
        mock_demand_service.bulk_upsert_shift_demands.return_value = ([], [])

        # Test period spanning 2 weeks
        target_start = date(2024, 1, 1)  # Monday (Week 1 of 2024)
        target_end = date(2024, 1, 14)  # Sunday (Week 2 of 2024)

        # Apply template
        result = await application_service.apply_template_to_period(
            template_id=even_odd_template.id,
            team_id=even_odd_template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify template service was called
        mock_template_service.get_template_by_id.assert_called_once_with(
            even_odd_template.id
        )

        # Verify result structure
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert replaced_count == 0

    def test_apply_template_week_to_period(self, application_service):
        """Test applying a single template week to a period."""
        # Create test template week
        template_week = TemplateWeekData(
            week_number=0,
            demands={
                "shift_1": [2, 3, 2, 2, 3, 0, 0],  # Mon-Sun
                "shift_2": [1, 1, 1, 1, 1, 0, 0],
            },
        )

        # Test period (one week)
        week_start = date(2024, 1, 1)  # Monday
        week_end = date(2024, 1, 7)  # Sunday

        # Apply template week
        demands = application_service._apply_template_week_to_period(
            template_week=template_week,
            week_start=week_start,
            week_end=week_end,
            team_id="team_456",
            template_id="template_123",
        )

        # Verify demands were created
        assert len(demands) > 0
        assert all(isinstance(d, ShiftDemandNew) for d in demands)
        assert all(d.source == ShiftDemandSource.TEMPLATE for d in demands)
        assert all(d.source_id == "template_123" for d in demands)

        # Verify demand values match template
        shift_1_demands = [d for d in demands if d.shift_id == "shift_1"]
        shift_2_demands = [d for d in demands if d.shift_id == "shift_2"]

        # Should have demands for weekdays only (0 values on weekends)
        assert len(shift_1_demands) == 5  # Mon-Fri
        assert len(shift_2_demands) == 5  # Mon-Fri

    @pytest.mark.asyncio
    async def test_validate_template_compatibility(
        self, application_service, mock_template_service, sample_template
    ):
        """Test template compatibility validation."""
        # Setup mock
        mock_template_service.get_template_by_id.return_value = sample_template

        # Test validation
        result = await application_service.validate_template_compatibility(
            template_id=sample_template.id,
            team_id=sample_template.team_id,
            target_start=date(2024, 1, 1),
            target_end=date(2024, 1, 7),
        )

        # Verify result structure
        assert "valid_shifts" in result
        assert "invalid_shifts" in result
        assert "warnings" in result
        assert isinstance(result["valid_shifts"], list)
        assert "shift_1" in result["valid_shifts"]
        assert "shift_2" in result["valid_shifts"]

    @pytest.mark.asyncio
    async def test_preview_template_application(
        self, application_service, mock_template_service, sample_template
    ):
        """Test template application preview."""
        # Setup mock
        mock_template_service.get_template_by_id.return_value = sample_template

        # Test preview
        result = await application_service.preview_template_application(
            template_id=sample_template.id,
            team_id=sample_template.team_id,
            target_start=date(2024, 1, 1),
            target_end=date(2024, 1, 7),
        )

        # Verify result structure
        assert "total_demands" in result
        assert "total_demand_value" in result
        assert "demands_by_shift" in result
        assert "demands_by_date" in result
        assert "affected_dates" in result
        assert "template_type" in result
        assert "template_weeks" in result

        assert result["template_type"] == TemplateType.STANDARD.value
        assert result["template_weeks"] == 1

    @pytest.mark.asyncio
    async def test_template_not_found_error(
        self, application_service, mock_template_service
    ):
        """Test error handling when template is not found."""
        # Setup mock to return None
        mock_template_service.get_template_by_id.return_value = None

        # Test that ValueError is raised
        with pytest.raises(ValueError, match="Template .* not found"):
            await application_service.apply_template_to_period(
                template_id="nonexistent",
                team_id="team_456",
                target_start=date(2024, 1, 1),
                target_end=date(2024, 1, 7),
            )

    @pytest.mark.asyncio
    async def test_team_ownership_validation(
        self, application_service, mock_template_service, sample_template
    ):
        """Test that templates can only be applied to the correct team."""
        # Setup mock
        mock_template_service.get_template_by_id.return_value = sample_template

        # Test with wrong team ID
        with pytest.raises(
            ValueError, match="does not belong to specified team"
        ):
            await application_service.apply_template_to_period(
                template_id=sample_template.id,
                team_id="wrong_team",
                target_start=date(2024, 1, 1),
                target_end=date(2024, 1, 7),
            )

    def test_invalid_date_range(self, application_service):
        """Test validation of invalid date ranges."""
        # Test with start date after end date
        with pytest.raises(ValueError, match="start date must be before"):
            application_service._apply_standard_template(
                template=Mock(weeks_data=[]),
                target_start=date(2024, 1, 7),
                target_end=date(2024, 1, 1),  # End before start
            )

    def test_even_odd_template_validation(self, application_service):
        """Test validation of even/odd templates."""
        # Test template with wrong number of weeks
        invalid_template = Mock()
        invalid_template.weeks_data = [Mock()]  # Only 1 week instead of 2

        with pytest.raises(ValueError, match="must have exactly 2 weeks"):
            application_service._apply_even_odd_template(
                template=invalid_template,
                target_start=date(2024, 1, 1),
                target_end=date(2024, 1, 7),
            )

    def test_empty_template_validation(self, application_service):
        """Test validation of templates with no weeks data."""
        # Test template with no weeks
        empty_template = Mock()
        empty_template.weeks_data = []

        with pytest.raises(ValueError, match="must have at least one week"):
            application_service._apply_standard_template(
                template=empty_template,
                target_start=date(2024, 1, 1),
                target_end=date(2024, 1, 7),
            )
