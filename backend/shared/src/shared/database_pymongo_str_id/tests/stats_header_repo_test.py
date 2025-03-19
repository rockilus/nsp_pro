import pytest

from shared.database_pymongo_str_id.database import MongoDB
from shared.database_pymongo_str_id.repositories.stats_header import (
    StatsHeaderRepository,
)
from shared.database_pymongo_str_id.schemas.stats_header import (
    StatsHeaderSchema,
)
from shared.schemas.schemas.constraint import ShiftWorkerOption, SWOIdTypes
from shared.schemas.schemas.stats import (
    HeaderUnitOptions,
    StatsHeader,
    StatsUnitOptions,
)


class TestStatsHeaderRepository:
    repo: StatsHeaderRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = StatsHeaderRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_stats_header(self):
        """Test creating a stats header."""
        stats_header = StatsHeader(
            id=None,
            team_id="team1",
            stats_unit=StatsUnitOptions.NB_DAYS_WORKED,
            header_unit=HeaderUnitOptions.WEEKDAY,
            value="1",
            selected_shifts=[
                ShiftWorkerOption(
                    name="name",
                    id="id",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="category_name",
                )
            ],
            is_favorite=True,
        )

        result = self.repo.create_stats_header(stats_header)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.stats_unit == StatsUnitOptions.NB_DAYS_WORKED

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"

    def test_get_stats_headers_by_team_id(self):
        """Test getting stats headers by team ID."""
        stats_header = StatsHeaderSchema(
            team="team1",
            stats_unit=StatsUnitOptions.NB_DAYS_WORKED.value,
            header_unit=HeaderUnitOptions.WEEKDAY.value,
            value="1",
            selected_shifts=[],
        )
        created = self.repo.create(stats_header)

        found = self.repo.get_stats_headers_by_team_id("team1")

        assert len(found) == 1
        assert found[0].id == created.id

    def test_get_stats_headers_by_team_unit_shifts(self):
        """Test getting stats headers by team ID, stats unit, and header unit."""
        stats_header = StatsHeaderSchema(
            team="team1",
            stats_unit=StatsUnitOptions.NB_DAYS_WORKED.value,
            header_unit=HeaderUnitOptions.WEEKDAY.value,
            value="1",
            selected_shifts=[],
        )
        created = self.repo.create(stats_header)

        found = self.repo.get_stats_headers_by_team_unit_shifts(
            "team1", StatsUnitOptions.NB_DAYS_WORKED, HeaderUnitOptions.WEEKDAY
        )

        assert len(found) == 1
        assert found[0].id == created.id

        # Test with no matching headers
        found_none = self.repo.get_stats_headers_by_team_unit_shifts(
            "team1", StatsUnitOptions.TIME_WORKED, HeaderUnitOptions.MONTH
        )
        assert len(found_none) == 0

    def test_update_stats_header(self):
        """Test updating a stats header."""
        stats_header = StatsHeaderSchema(
            team="team1",
            stats_unit=StatsUnitOptions.NB_DAYS_WORKED.value,
            header_unit=HeaderUnitOptions.WEEKDAY.value,
            value="1",
            selected_shifts=[],
        )
        created = self.repo.create(stats_header)

        updated_stats_header = StatsHeader(
            id=created.id,
            team_id="team1",
            stats_unit=StatsUnitOptions.TIME_WORKED,
            header_unit=HeaderUnitOptions.MONTH,
            value="2",
            selected_shifts=[
                ShiftWorkerOption(
                    name="name",
                    id="id",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="category_name",
                )
            ],
            is_favorite=False,
        )

        result = self.repo.update_stats_header(updated_stats_header)

        assert result.stats_unit == StatsUnitOptions.TIME_WORKED
        assert result.header_unit == HeaderUnitOptions.MONTH

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["stats_unit"] == StatsUnitOptions.TIME_WORKED.value

    def test_delete_stats_header(self):
        """Test deleting a stats header."""
        stats_header = StatsHeaderSchema(
            team="team1",
            stats_unit=StatsUnitOptions.NB_DAYS_WORKED.value,
            header_unit=HeaderUnitOptions.WEEKDAY.value,
            value="1",
            selected_shifts=[],
        )
        created = self.repo.create(stats_header)

        self.repo.delete_stats_header(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None
