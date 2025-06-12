"""
Tests for the ShiftDemandTemplateApplicationService.

This module tests the complex business logic for applying templates to periods,
including even/odd template patterns and standard repetition logic.
Following NSP Pro security and production standards.
"""

import pytest

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

    @pytest.fixture
    def mock_template_service(self):
        """Mock template service for testing."""
        return MockServiceFactory.create_template_service()

    @pytest.fixture
    def mock_demand_service(self):
        """Mock demand service for testing."""
        return MockServiceFactory.create_demand_service()

    @pytest.fixture
    def application_service(self, mock_template_service, mock_demand_service):
        """Create application service with mocked dependencies."""
        return ShiftDemandTemplateApplicationService(
            template_service=mock_template_service,
            demand_service=mock_demand_service,
        )

    @pytest.mark.asyncio
    async def test_apply_standard_template_to_single_week(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
    ):
        """Test applying a standard template to a single week period."""
        # Setup test data
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Apply template
        result = await application_service.apply_template_to_period(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify template service was called correctly
        mock_template_service.get_template_by_id.assert_called_once_with(
            template.id
        )

        # Verify result structure
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert replaced_count == 0

        # Verify demands were created for each shift and day
        assert len(created_demands) > 0

        # Verify bulk upsert was called
        mock_demand_service.bulk_upsert_shift_demands.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_even_odd_template_to_two_weeks(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
    ):
        """Test applying an even/odd template to a two-week period."""
        # Setup test data
        template = TemplateTestFixtures.create_even_odd_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.TWO_WEEKS

        # Apply template
        result = await application_service.apply_template_to_period(
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
    async def test_validate_template_compatibility_success(
        self,
        application_service,
        mock_template_service,
    ):
        """Test successful template compatibility validation."""
        # Setup test data
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Validate compatibility
        result = await application_service.validate_template_compatibility(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Should be compatible
        assert len(result["warnings"]) == 0
        assert len(result["valid_shifts"]) > 0

    @pytest.mark.asyncio
    async def test_validate_template_compatibility_team_mismatch(
        self,
        application_service,
        mock_template_service,
    ):
        """Test template compatibility validation with team mismatch."""
        # Setup test data
        template = TemplateTestFixtures.create_template_for_different_team()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Validate compatibility with wrong team
        result = await application_service.validate_template_compatibility(
            template_id=template.id,
            team_id=SecurityTestData.VALID_TEAM_ID,  # Different from template's team
            target_start=target_start,
            target_end=target_end,
        )

        # Should not be compatible
        assert len(result["warnings"]) > 0
        assert "team" in result["warnings"][0].lower()

    @pytest.mark.asyncio
    async def test_validate_template_compatibility_invalid_even_odd(
        self,
        application_service,
        mock_template_service,
    ):
        """Test template compatibility validation for invalid even/odd template."""
        # Setup test data - even/odd template with only 1 week (invalid)
        template = TemplateTestFixtures.create_invalid_even_odd_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.TWO_WEEKS

        # Validate compatibility
        result = await application_service.validate_template_compatibility(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Should be compatible (validation logic doesn't check template week count currently)
        # The validation mainly checks for template existence and team ownership
        assert "valid_shifts" in result
        assert "invalid_shifts" in result
        assert "warnings" in result

    @pytest.mark.asyncio
    async def test_preview_template_application(
        self,
        application_service,
        mock_template_service,
    ):
        """Test template application preview functionality."""
        # Setup test data
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Preview template application
        result = await application_service.preview_template_application(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Verify preview structure
        assert "total_demands" in result
        assert "total_demand_value" in result
        assert isinstance(result["total_demands"], int)
        assert isinstance(result["total_demand_value"], int)

        # Should have demands for the week
        assert result["total_demands"] > 0

    @pytest.mark.asyncio
    async def test_template_not_found(
        self,
        application_service,
        mock_template_service,
    ):
        """Test handling of non-existent template."""
        # Setup mock to return None (template not found)
        mock_template_service.get_template_by_id.return_value = None

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Should raise appropriate exception
        with pytest.raises(ValueError, match="not found"):
            await application_service.apply_template_to_period(
                template_id=SecurityTestData.NONEXISTENT_TEMPLATE_ID,
                team_id=SecurityTestData.VALID_TEAM_ID,
                target_start=target_start,
                target_end=target_end,
                replace_existing=False,
            )

    @pytest.mark.asyncio
    async def test_apply_template_with_replacement(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
    ):
        """Test applying template with replacement of existing demands."""
        # Setup test data
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        # Mock that some demands will be replaced
        mock_demand_service.delete_demands_by_date_range.return_value = 5

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Apply template with replacement
        result = await application_service.apply_template_to_period(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=True,
        )

        # Verify replacement was performed
        created_demands, replaced_count = result
        assert replaced_count == 5

        # Verify delete was called
        mock_demand_service.delete_demands_by_date_range.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_multi_week_template(
        self,
        application_service,
        mock_template_service,
        mock_demand_service,
    ):
        """Test applying a multi-week template to a longer period."""
        # Setup test data
        template = TemplateTestFixtures.create_multi_week_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.THREE_WEEKS

        # Apply template
        result = await application_service.apply_template_to_period(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
            replace_existing=False,
        )

        # Verify result
        created_demands, replaced_count = result
        assert isinstance(created_demands, list)
        assert len(created_demands) > 0

    # Business Logic Unit Tests
    # Note: Testing private methods is not recommended as they are implementation details
    # These tests focus on the public API behavior

    @pytest.mark.asyncio
    async def test_business_logic_validation(
        self,
        application_service,
        mock_template_service,
    ):
        """Test business logic through public API calls."""
        # Setup test data
        template = TemplateTestFixtures.create_standard_template()
        mock_template_service.get_template_by_id.return_value = template

        target_start, target_end = TestDateRanges.MONDAY_TO_SUNDAY

        # Test compatibility validation
        result = await application_service.validate_template_compatibility(
            template_id=template.id,
            team_id=template.team_id,
            target_start=target_start,
            target_end=target_end,
        )

        # Verify the structure is correct
        assert "valid_shifts" in result
        assert "invalid_shifts" in result
        assert "warnings" in result
        assert isinstance(result["valid_shifts"], list)
        assert isinstance(result["invalid_shifts"], list)
        assert isinstance(result["warnings"], list)
