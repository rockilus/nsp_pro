from datetime import date, datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.shift_demand_new import (
    ShiftDemandNewRepository,
)
from shared.schemas.core.shift_demand_new import (
    ShiftDemandNew,
    ShiftDemandSource,
)


# pylint: disable=too-many-public-methods
class TestShiftDemandNewRepository:
    """Test suite for ShiftDemandNewRepository."""

    repo: ShiftDemandNewRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ShiftDemandNewRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    def _create_test_shift_demand(
        self,
        team_id: str = "team1",
        shift_id: str = "shift1",
        demand_date: date | None = None,
        count: int = 2,
        notes: str | None = None,
        source: ShiftDemandSource = ShiftDemandSource.MANUAL,
        source_id: str | None = None,
    ) -> ShiftDemandNew:
        """Helper method to create a test shift demand."""
        if demand_date is None:
            demand_date = date(2025, 1, 15)

        return ShiftDemandNew(
            id=None,
            team_id=team_id,
            shift_id=shift_id,
            date=demand_date,
            count=count,
            notes=notes,
            source=source,
            source_id=source_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    def test_create_shift_demand(self):
        """Test creating a shift demand."""
        shift_demand = self._create_test_shift_demand()

        result = self.repo.create_shift_demand(shift_demand)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.shift_id == "shift1"
        assert result.date == date(2025, 1, 15)
        assert result.count == 2
        assert result.source == ShiftDemandSource.MANUAL
        assert result.created_at is not None
        assert result.updated_at is not None

        # Verify it was saved to database
        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["shift"] == "shift1"
        assert saved_doc["count"] == 2
        assert saved_doc["source"] == "manual"

    def test_create_shift_demand_with_notes(self):
        """Test creating a shift demand with notes."""
        shift_demand = self._create_test_shift_demand(
            notes="High priority shift",
            source=ShiftDemandSource.TEMPLATE,
            source_id="template123",
        )

        result = self.repo.create_shift_demand(shift_demand)

        assert result.notes == "High priority shift"
        assert result.source == ShiftDemandSource.TEMPLATE
        assert result.source_id == "template123"

    def test_get_shift_demand_by_id(self):
        """Test getting a shift demand by ID."""
        shift_demand = self._create_test_shift_demand()
        created = self.repo.create_shift_demand(shift_demand)

        result = self.repo.get_shift_demand_by_id(created.id)

        assert result is not None
        assert result.id == created.id
        assert result.team_id == created.team_id
        assert result.shift_id == created.shift_id
        assert result.date == created.date
        assert result.count == created.count

    def test_get_shift_demand_by_id_not_found(self):
        """Test getting a shift demand by non-existent ID."""
        result = self.repo.get_shift_demand_by_id("nonexistent")

        assert result is None

    def test_get_shift_demands_by_team_id(self):
        """Test getting all shift demands for a team."""
        # Create shift demands for different teams
        shift_demand1 = self._create_test_shift_demand(
            team_id="team1", shift_id="shift1"
        )
        shift_demand2 = self._create_test_shift_demand(
            team_id="team1", shift_id="shift2"
        )
        shift_demand3 = self._create_test_shift_demand(
            team_id="team2", shift_id="shift1"
        )

        self.repo.create_shift_demand(shift_demand1)
        self.repo.create_shift_demand(shift_demand2)
        self.repo.create_shift_demand(shift_demand3)

        result = self.repo.get_shift_demands_by_team_id("team1")

        assert len(result) == 2
        team_ids = [sd.team_id for sd in result]
        assert all(team_id == "team1" for team_id in team_ids)

    def test_get_shift_demands_by_date_range(self):
        """Test getting shift demands for a team within a date range."""
        # Create shift demands on different dates
        shift_demand1 = self._create_test_shift_demand(
            demand_date=date(2025, 1, 10)
        )
        shift_demand2 = self._create_test_shift_demand(
            demand_date=date(2025, 1, 15)
        )
        shift_demand3 = self._create_test_shift_demand(
            demand_date=date(2025, 1, 20)
        )
        shift_demand4 = self._create_test_shift_demand(
            demand_date=date(2025, 1, 25)
        )

        self.repo.create_shift_demand(shift_demand1)
        self.repo.create_shift_demand(shift_demand2)
        self.repo.create_shift_demand(shift_demand3)
        self.repo.create_shift_demand(shift_demand4)

        # Query for date range 2025-01-12 to 2025-01-22
        result = self.repo.get_shift_demands_by_date_range(
            "team1", date(2025, 1, 12), date(2025, 1, 22)
        )

        assert len(result) == 2
        dates = [sd.date for sd in result]
        assert date(2025, 1, 15) in dates
        assert date(2025, 1, 20) in dates

    def test_get_shift_demands_by_team_shift_and_date_range(self):
        """Test getting shift demands for a specific team/shift within a date range."""
        # Create shift demands for different shifts and dates
        shift_demand1 = self._create_test_shift_demand(
            shift_id="shift1", demand_date=date(2025, 1, 15)
        )
        shift_demand2 = self._create_test_shift_demand(
            shift_id="shift2", demand_date=date(2025, 1, 15)
        )
        shift_demand3 = self._create_test_shift_demand(
            shift_id="shift1", demand_date=date(2025, 1, 20)
        )

        self.repo.create_shift_demand(shift_demand1)
        self.repo.create_shift_demand(shift_demand2)
        self.repo.create_shift_demand(shift_demand3)

        result = self.repo.get_shift_demands_by_shift_and_date_range(
            "team1", "shift1", date(2025, 1, 10), date(2025, 1, 25)
        )

        assert len(result) == 2
        for sd in result:
            assert sd.shift_id == "shift1"
            assert sd.date in [date(2025, 1, 15), date(2025, 1, 20)]

    def test_update_shift_demand(self):
        """Test updating a shift demand."""
        shift_demand = self._create_test_shift_demand(count=2)
        created = self.repo.create_shift_demand(shift_demand)

        # Update the shift demand
        created.count = 5
        created.notes = "Updated notes"
        created.update_timestamp()

        result = self.repo.update_shift_demand(created)

        assert result.count == 5
        assert result.notes == "Updated notes"
        assert result.updated_at > result.created_at

        # Verify in database
        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc["count"] == 5
        assert saved_doc["notes"] == "Updated notes"

    def test_update_shift_demand_not_found(self):
        """Test updating a non-existent shift demand raises error."""
        shift_demand = self._create_test_shift_demand()
        shift_demand.id = "nonexistent"

        with pytest.raises(ValueError, match="Failed to update shift demand"):
            self.repo.update_shift_demand(shift_demand)

    def test_delete_shift_demand(self):
        """Test deleting a shift demand."""
        shift_demand = self._create_test_shift_demand()
        created = self.repo.create_shift_demand(shift_demand)

        result = self.repo.delete_shift_demand(created.id)

        assert result is True

        # Verify it's deleted
        found = self.repo.get_shift_demand_by_id(created.id)
        assert found is None

    def test_delete_shift_demand_not_found(self):
        """Test deleting a non-existent shift demand."""
        result = self.repo.delete_shift_demand("nonexistent")

        assert result is False

    def test_bulk_create_shift_demands(self):
        """Test creating multiple shift demands in bulk."""
        shift_demands = [
            self._create_test_shift_demand(
                shift_id="shift1", demand_date=date(2025, 1, 15)
            ),
            self._create_test_shift_demand(
                shift_id="shift2", demand_date=date(2025, 1, 16)
            ),
            self._create_test_shift_demand(
                shift_id="shift3", demand_date=date(2025, 1, 17)
            ),
        ]

        results = self.repo.bulk_create_shift_demands(shift_demands)

        assert len(results) == 3
        for result in results:
            assert result.id is not None
            assert result.team_id == "team1"

        # Verify all were saved
        all_demands = self.repo.get_shift_demands_by_team_id("team1")
        assert len(all_demands) == 3

    def test_delete_demands_by_date_range(self):
        """Test deleting shift demands for a team within a date range."""
        # Create shift demands on different dates
        shift_demands = [
            self._create_test_shift_demand(demand_date=date(2025, 1, 10)),
            self._create_test_shift_demand(demand_date=date(2025, 1, 15)),
            self._create_test_shift_demand(demand_date=date(2025, 1, 20)),
            self._create_test_shift_demand(demand_date=date(2025, 1, 25)),
        ]

        for sd in shift_demands:
            self.repo.create_shift_demand(sd)

        # Delete demands between 2025-01-12 and 2025-01-22
        deleted_count = self.repo.delete_demands_by_date_range(
            "team1", date(2025, 1, 12), date(2025, 1, 22)
        )

        assert deleted_count == 2

        # Verify only the demands outside the range remain
        remaining = self.repo.get_shift_demands_by_team_id("team1")
        assert len(remaining) == 2
        dates = [sd.date for sd in remaining]
        assert date(2025, 1, 10) in dates
        assert date(2025, 1, 25) in dates

    def test_bulk_upsert_shift_demands_create_new(self):
        """Test bulk upserting shift demands when they don't exist (create)."""
        shift_demands = [
            self._create_test_shift_demand(shift_id="shift1", count=2),
            self._create_test_shift_demand(shift_id="shift2", count=3),
            self._create_test_shift_demand(shift_id="shift3", count=4),
        ]

        created, updated = self.repo.bulk_upsert_shift_demands(shift_demands)

        assert len(created) == 3
        assert len(updated) == 0

        for demand in created:
            assert demand.id is not None
            assert demand.team_id == "team1"

        # Verify they were created
        all_demands = self.repo.get_shift_demands_by_team_id("team1")
        assert len(all_demands) == 3

    def test_bulk_upsert_shift_demands_update_existing(self):
        """Test bulk upserting shift demands when some exist (update)."""
        # First create some shift demands
        existing_demands = [
            self._create_test_shift_demand(shift_id="shift1", count=2),
            self._create_test_shift_demand(shift_id="shift2", count=3),
        ]

        created_demand1 = self.repo.create_shift_demand(existing_demands[0])
        created_demand2 = self.repo.create_shift_demand(existing_demands[1])

        # Now update them and add a new one
        update_demands = [
            self._create_test_shift_demand(
                shift_id="shift1", count=5
            ),  # Update
            self._create_test_shift_demand(
                shift_id="shift2", count=6
            ),  # Update
            self._create_test_shift_demand(
                shift_id="shift3", count=4
            ),  # Create new
        ]

        # Set IDs for update operations
        update_demands[0].id = created_demand1.id
        update_demands[1].id = created_demand2.id

        created, updated = self.repo.bulk_upsert_shift_demands(update_demands)

        assert len(created) == 1  # New shift3
        assert len(updated) == 2  # Updated shift1 and shift2

        # Verify all exist with correct counts
        all_demands = self.repo.get_shift_demands_by_team_id("team1")
        assert len(all_demands) == 3

        counts_by_shift = {sd.shift_id: sd.count for sd in all_demands}
        assert counts_by_shift["shift1"] == 5
        assert counts_by_shift["shift2"] == 6
        assert counts_by_shift["shift3"] == 4

    def test_shift_demand_with_different_sources(self):
        """Test creating shift demands with different sources."""
        sources_to_test = [
            ShiftDemandSource.MANUAL,
            ShiftDemandSource.TEMPLATE,
            ShiftDemandSource.DUPLICATED,
            ShiftDemandSource.RECURRENCE,
        ]

        for i, source in enumerate(sources_to_test):
            shift_demand = self._create_test_shift_demand(
                shift_id=f"shift{i+1}",
                source=source,
                source_id=(
                    f"source{i+1}"
                    if source != ShiftDemandSource.MANUAL
                    else None
                ),
            )
            result = self.repo.create_shift_demand(shift_demand)
            assert result.source == source
            if source != ShiftDemandSource.MANUAL:
                assert result.source_id == f"source{i+1}"

    def test_shift_demand_date_edge_cases(self):
        """Test shift demands on edge case dates."""
        # Test year boundary
        shift_demand1 = self._create_test_shift_demand(
            demand_date=date(2024, 12, 31)
        )
        shift_demand2 = self._create_test_shift_demand(
            demand_date=date(2025, 1, 1)
        )

        result1 = self.repo.create_shift_demand(shift_demand1)
        result2 = self.repo.create_shift_demand(shift_demand2)

        assert result1.date == date(2024, 12, 31)
        assert result2.date == date(2025, 1, 1)

        # Test querying across year boundary
        results = self.repo.get_shift_demands_by_date_range(
            "team1", date(2024, 12, 30), date(2025, 1, 2)
        )
        assert len(results) == 2

    def test_shift_demand_with_zero_count(self):
        """
        Test that creating a shift demand with zero count raises a validation error.
        """
        shift_demand = self._create_test_shift_demand(count=0)

        with pytest.raises(ValueError, match="count must be greater than 0"):
            self.repo.create_shift_demand(shift_demand)

    def test_shift_demand_with_large_count(self):
        """Test creating a shift demand with a large count."""
        shift_demand = self._create_test_shift_demand(count=999)

        result = self.repo.create_shift_demand(shift_demand)

        assert result.count == 999

    def test_shift_demand_with_long_notes(self):
        """Test creating a shift demand with long notes."""
        long_notes = "A" * 500  # Maximum allowed length
        shift_demand = self._create_test_shift_demand(notes=long_notes)

        result = self.repo.create_shift_demand(shift_demand)

        assert result.notes == long_notes

    def test_multiple_teams_isolation(self):
        """Test that operations are properly isolated between teams."""
        # Create shift demands for different teams
        team1_demand = self._create_test_shift_demand(team_id="team1")
        team2_demand = self._create_test_shift_demand(team_id="team2")

        self.repo.create_shift_demand(team1_demand)
        self.repo.create_shift_demand(team2_demand)

        # Test team1 only gets its demands
        team1_demands = self.repo.get_shift_demands_by_team_id("team1")
        assert len(team1_demands) == 1
        assert team1_demands[0].team_id == "team1"

        # Test team2 only gets its demands
        team2_demands = self.repo.get_shift_demands_by_team_id("team2")
        assert len(team2_demands) == 1
        assert team2_demands[0].team_id == "team2"

        # Test deletion is isolated
        deleted_count = self.repo.delete_demands_by_date_range(
            "team1", date(2025, 1, 1), date(2025, 1, 31)
        )
        assert deleted_count == 1

        # team2 should still have its demand
        team2_demands_after = self.repo.get_shift_demands_by_team_id("team2")
        assert len(team2_demands_after) == 1

    def test_empty_results(self):
        """Test queries that should return empty results."""
        # Test empty team
        result = self.repo.get_shift_demands_by_team_id("nonexistent_team")
        assert result == []

        # Test empty date range
        result = self.repo.get_shift_demands_by_date_range(
            "team1", date(2025, 1, 1), date(2025, 1, 31)
        )
        assert result == []

        # Test empty specific shift
        result = self.repo.get_shift_demands_by_shift_and_date_range(
            "team1", "nonexistent_shift", date(2025, 1, 1), date(2025, 1, 31)
        )
        assert result == []

    def test_timestamp_updates(self):
        """Test that timestamps are properly handled."""
        shift_demand = self._create_test_shift_demand()
        created = self.repo.create_shift_demand(shift_demand)

        original_created = created.created_at
        original_updated = created.updated_at

        # Update the demand
        created.count = 10
        created.update_timestamp()
        updated = self.repo.update_shift_demand(created)

        assert updated.created_at == original_created  # Should not change
        assert updated.updated_at > original_updated  # Should be newer

    def test_get_demands_by_source(self):
        """Test getting demands by source type and optional source ID."""
        # Create shift demands with different sources
        manual_demand = self._create_test_shift_demand(
            shift_id="shift1", source=ShiftDemandSource.MANUAL
        )
        template_demand1 = self._create_test_shift_demand(
            shift_id="shift2",
            source=ShiftDemandSource.TEMPLATE,
            source_id="template123",
        )
        template_demand2 = self._create_test_shift_demand(
            shift_id="shift3",
            source=ShiftDemandSource.TEMPLATE,
            source_id="template456",
        )
        duplicated_demand = self._create_test_shift_demand(
            shift_id="shift4",
            source=ShiftDemandSource.DUPLICATED,
            source_id="dup789",
        )

        self.repo.create_shift_demand(manual_demand)
        self.repo.create_shift_demand(template_demand1)
        self.repo.create_shift_demand(template_demand2)
        self.repo.create_shift_demand(duplicated_demand)

        # Test getting all template demands
        template_demands = self.repo.get_demands_by_source(
            "team1", ShiftDemandSource.TEMPLATE
        )
        assert len(template_demands) == 2

        # Test getting specific template by source_id
        specific_template = self.repo.get_demands_by_source(
            "team1", ShiftDemandSource.TEMPLATE, "template123"
        )
        assert len(specific_template) == 1
        assert specific_template[0].shift_id == "shift2"
        assert specific_template[0].source_id == "template123"

        # Test getting manual demands (no source_id)
        manual_demands = self.repo.get_demands_by_source(
            "team1", ShiftDemandSource.MANUAL
        )
        assert len(manual_demands) == 1
        assert manual_demands[0].shift_id == "shift1"

    def test_delete_demands_by_date_range_with_shift_filter(self):
        """Test deleting demands with optional shift filter."""
        # Create demands for different shifts and dates
        shift_demands = [
            self._create_test_shift_demand(
                shift_id="shift1", demand_date=date(2025, 1, 15)
            ),
            self._create_test_shift_demand(
                shift_id="shift2", demand_date=date(2025, 1, 15)
            ),
            self._create_test_shift_demand(
                shift_id="shift1", demand_date=date(2025, 1, 20)
            ),
            self._create_test_shift_demand(
                shift_id="shift3", demand_date=date(2025, 1, 20)
            ),
        ]

        for sd in shift_demands:
            self.repo.create_shift_demand(sd)

        # Delete only shift1 demands in the date range
        deleted_count = self.repo.delete_demands_by_date_range(
            "team1", date(2025, 1, 10), date(2025, 1, 25), shift_ids=["shift1"]
        )

        assert deleted_count == 2  # Only shift1 demands deleted

        # Verify shift2 and shift3 demands remain
        remaining = self.repo.get_shift_demands_by_team_id("team1")
        assert len(remaining) == 2
        shift_ids = [sd.shift_id for sd in remaining]
        assert "shift2" in shift_ids
        assert "shift3" in shift_ids
        assert "shift1" not in shift_ids
