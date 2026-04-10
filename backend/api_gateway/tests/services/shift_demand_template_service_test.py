from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)

from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)


@pytest.fixture
def mock_db_collections() -> MagicMock:
    """Mock database collections."""
    collections = MagicMock()
    collections.shift_demand_template_db = MagicMock()
    collections.shift_demand_new_db = MagicMock()
    return collections


# pylint: disable=redefined-outer-name
@pytest.fixture
def template_service(mock_db_collections) -> ShiftDemandTemplateService:
    """Create template service with mocked dependencies."""
    return ShiftDemandTemplateService(mock_db_collections)


@pytest.fixture
def sample_template() -> ShiftDemandTemplate:
    """Sample template for testing."""
    return ShiftDemandTemplate(
        id="template-123",
        name="Test Template",
        description="Test description",
        team_id="team-456",
        template_type=TemplateType.STANDARD,
        weeks_data=[
            TemplateWeekData(week_number=0, demands=[]),
            TemplateWeekData(week_number=1, demands=[]),
        ],
        created_by="user-789",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# pylint: disable=too-few-public-methods
class MockShiftDemand:
    """Mock shift demand for testing."""

    def __init__(self, date, shift_id, count):
        self.date = date
        self.shift_id = shift_id
        self.count = count


# pylint: disable=redefined-outer-name
@pytest.mark.asyncio
async def test_apply_demands_to_template_week_success(
    template_service, mock_db_collections, sample_template
):
    """Test successful application of demands to template week."""
    # Arrange
    template_id = "template-123"
    team_id = "team-456"
    source_week_start = datetime(2023, 6, 19, tzinfo=timezone.utc)  # Monday
    target_week_number = 1

    # Mock template validation
    mock_db_collections.shift_demand_template_db.get_template_by_id.return_value = (
        sample_template
    )

    # Mock source demands
    mock_demands = [
        MockShiftDemand(date=datetime(2023, 6, 19).date(), shift_id="shift-1", count=2),
        MockShiftDemand(date=datetime(2023, 6, 20).date(), shift_id="shift-2", count=3),
    ]
    # fmt: off
    mock_db_collections\
        .shift_demand_new_db.get_shift_demands_by_date_range.return_value = (
            mock_demands
        )
    # fmt: on

    # Mock template update
    updated_template = sample_template
    mock_db_collections.shift_demand_template_db.update_template.return_value = (
        updated_template
    )

    # Act
    result = await template_service.apply_demands_to_template_week(
        template_id=template_id,
        team_id=team_id,
        source_week_start=source_week_start,
        target_week_number=target_week_number,
    )

    # Assert
    assert result == updated_template
    # fmt: off
    mock_db_collections\
        .shift_demand_template_db.get_template_by_id.assert_called_once_with(
            template_id
        )
    mock_db_collections\
        .shift_demand_new_db.get_shift_demands_by_date_range.assert_called_once()
    # fmt: on
    mock_db_collections.shift_demand_template_db.update_template.assert_called_once()


@pytest.mark.asyncio
async def test_apply_demands_to_template_week_template_not_found(
    template_service, mock_db_collections
):
    """Test handling when template is not found."""
    # Arrange
    template_id = "nonexistent-template"
    team_id = "team-456"
    source_week_start = datetime(2023, 6, 19, tzinfo=timezone.utc)
    target_week_number = 1

    # Mock template not found
    mock_db_collections.shift_demand_template_db.get_template_by_id.return_value = None

    # Act & Assert
    with pytest.raises(ValueError, match="Template .* not found"):
        await template_service.apply_demands_to_template_week(
            template_id=template_id,
            team_id=team_id,
            source_week_start=source_week_start,
            target_week_number=target_week_number,
        )


@pytest.mark.asyncio
async def test_apply_demands_to_template_week_wrong_team(
    template_service, mock_db_collections, sample_template
):
    """Test handling when template belongs to different team."""
    # Arrange
    template_id = "template-123"
    team_id = "wrong-team"
    source_week_start = datetime(2023, 6, 19, tzinfo=timezone.utc)
    target_week_number = 1

    # Mock template found but belongs to different team
    mock_db_collections.shift_demand_template_db.get_template_by_id.return_value = (
        sample_template
    )

    # Act & Assert
    with pytest.raises(ValueError, match="does not belong to team"):
        await template_service.apply_demands_to_template_week(
            template_id=template_id,
            team_id=team_id,
            source_week_start=source_week_start,
            target_week_number=target_week_number,
        )
