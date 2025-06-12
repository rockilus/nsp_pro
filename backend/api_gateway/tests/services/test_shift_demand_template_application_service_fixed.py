"""
Tests for the ShiftDemandTemplateApplicationService.

This module tests the complex business logic for applying templates to periods,
including even/odd template patterns and standard repetition logic.
Following NSP Pro security and production standards.
"""

import os
import sys
from datetime import date

import pytest

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../src'))

from src.services.shift_demand_template_application_service import (
    ShiftDemandTemplateApplicationService,
)
from tests.fixtures.template_test_data import (
    TemplateTestFixtures,
    MockServiceFactory,
    TestDateRanges,
    SecurityTestData,
)


class TestShiftDemandTemplateApplicationService:
    """Test cases for ShiftDemandTemplateApplicationService."""

    @pytest.mark.asyncio
    async def test_apply_standard_template_to_period(self):
        """Test applying a standard template to a period."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup template fixture
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        # Setup mock return values
        mock_demand_service.delete_demands_by_date_range.return_value = 0
        mock_demand_service.bulk_upsert_shift_demands.return_value = ([], [])

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Apply template
        result = await service.apply_template_to_period(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify template service was called
        mock_template_service.get_template_by_id.assert_called_once_with(
            template.id
        )

        # Verify result structure
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert replaced_count == 0

    @pytest.mark.asyncio
    async def test_apply_even_odd_template_to_period(self):
        """Test applying an even/odd template to a period."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup template fixture
        template = TemplateTestFixtures.create_even_odd_template()
        mock_template_service.get_template_by_id.return_value = template

        # Setup mock return values
        mock_demand_service.delete_demands_by_date_range.return_value = 0
        mock_demand_service.bulk_upsert_shift_demands.return_value = ([], [])

        # Use two-week test date range for even/odd
        target_start, target_end = TestDateRanges.TWO_WEEKS

        # Apply template
        result = await service.apply_template_to_period(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify template service was called
        mock_template_service.get_template_by_id.assert_called_once_with(
            template.id
        )

        # Verify result structure
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert replaced_count == 0

    @pytest.mark.asyncio
    async def test_template_compatibility_validation(self):
        """Test template compatibility validation."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup template fixture
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test validation
        result = await service.validate_template_compatibility(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Verify result structure
        assert "valid_shifts" in result
        assert "invalid_shifts" in result
        assert "warnings" in result
        assert isinstance(result["valid_shifts"], list)

    @pytest.mark.asyncio
    async def test_template_application_preview(self):
        """Test template application preview."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup template fixture
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test preview
        result = await service.preview_template_application(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Verify result structure
        assert "total_demands" in result
        assert "total_demand_value" in result
        assert "demands_by_shift" in result
        assert "demands_by_date" in result
        assert "affected_dates" in result
        assert "template_type" in result
        assert "template_weeks" in result

    @pytest.mark.asyncio
    async def test_template_not_found_error(self):
        """Test error handling when template is not found."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup mock to return None
        mock_template_service.get_template_by_id.return_value = None

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test that ValueError is raised
        with pytest.raises(ValueError, match="Template .* not found"):
            await service.apply_template_to_period(
                template_id=SecurityTestData.NONEXISTENT_TEMPLATE_ID,
                team_id=SecurityTestData.VALID_TEAM_ID,
                target_start=target_start,
                target_end=target_end,
            )

    @pytest.mark.asyncio
    async def test_team_ownership_validation_error(self):
        """Test that templates can only be applied to the correct team."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Setup template fixture
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test with wrong team ID using security test data
        with pytest.raises(
            ValueError, match="does not belong to specified team"
        ):
            await service.apply_template_to_period(
                template_id=template.id,
                team_id=SecurityTestData.INVALID_TEAM_ID,
                target_start=target_start,
                target_end=target_end,
            )

    def test_invalid_date_range_validation(self):
        """Test validation of invalid date ranges."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Test with invalid date range
        invalid_start, invalid_end = TestDateRanges.INVALID_RANGE

        # Test that ValueError is raised
        with pytest.raises(ValueError, match="start date must be before"):
            service._apply_standard_template(
                template=TemplateTestFixtures.create_standard_template(),
                target_start=invalid_start,
                target_end=invalid_end,
            )

    def test_even_odd_template_validation_error(self):
        """Test validation of even/odd templates with wrong number of weeks."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Use invalid even/odd template (only 1 week instead of 2)
        invalid_template = (
            TemplateTestFixtures.create_invalid_even_odd_template()
        )

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test that ValueError is raised
        with pytest.raises(ValueError, match="must have exactly 2 weeks"):
            service._apply_even_odd_template(
                template=invalid_template,
                target_start=target_start,
                target_end=target_end,
            )

    def test_empty_template_validation_error(self):
        """Test validation of templates with no weeks data."""
        # Create service with mock dependencies
        mock_template_service = MockServiceFactory.create_template_service()
        mock_demand_service = MockServiceFactory.create_demand_service()
        service = ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

        # Use empty template
        empty_template = TemplateTestFixtures.create_empty_template()

        # Use standard test date range
        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test that ValueError is raised
        with pytest.raises(ValueError, match="must have at least one week"):
            service._apply_standard_template(
                template=empty_template,
                target_start=target_start,
                target_end=target_end,
            )
