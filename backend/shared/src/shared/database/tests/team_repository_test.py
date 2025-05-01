from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.team import TeamRepository
from shared.database.schemas.team import TeamSchema
from shared.schemas.core.team import Team


class TestTeamRepository:
    repo: TeamRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = TeamRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_team(self):
        """Test creating a team."""
        team = Team(
            id="",
            name="Test Team",
            created_by_user_id="user123",
            created_at=datetime.now(timezone.utc),
        )

        result = self.repo.create_team(team)

        assert result.id is not None
        assert result.name == "Test Team"
        assert result.created_by_user_id == "user123"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "Test Team"
        assert saved_doc["created_by_user_id"] == "user123"

    def test_get_team_by_id(self):
        """Test getting a team by ID."""
        team = TeamSchema(
            id="",
            name="Test Team",
            created_by_user_id="user123",
            created_at=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(team)

        found = self.repo.get_team_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Test Team"
        assert found.created_by_user_id == "user123"

    def test_update_team(self):
        """Test updating a team."""
        team = TeamSchema(
            id="",
            name="Test Team",
            created_by_user_id="user123",
            created_at=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(team)

        updated_team = Team(
            id=created.id,
            name="Updated Team",
            created_by_user_id="user456",
            created_at=datetime.fromtimestamp(created.created_at),
        )

        result = self.repo.update_team(updated_team)

        assert result.name == "Updated Team"
        assert result.created_by_user_id == "user456"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "Updated Team"
        assert from_db["created_by_user_id"] == "user456"

    def test_delete_team(self):
        """Test deleting a team."""
        team = TeamSchema(
            id="",
            name="Test Team",
            created_by_user_id="user123",
            created_at=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(team)

        self.repo.delete_team(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_teams(self):
        """Test getting all teams."""
        teams = [
            TeamSchema(
                id="",
                name="Team 1",
                created_by_user_id="user1",
                created_at=datetime.now(timezone.utc).timestamp(),
            ),
            TeamSchema(
                id="",
                name="Team 2",
                created_by_user_id="user2",
                created_at=datetime.now(timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(teams)

        all_teams = self.repo.get_teams()
        assert len(all_teams) == 2

    def test_get_teams_by_ids(self):
        """Test getting multiple teams by their IDs."""
        teams = [
            TeamSchema(
                id="",
                name="Team 1",
                created_by_user_id="user1",
                created_at=datetime.now(timezone.utc).timestamp(),
            ),
            TeamSchema(
                id="",
                name="Team 2",
                created_by_user_id="user2",
                created_at=datetime.now(timezone.utc).timestamp(),
            ),
        ]
        created_teams = self.repo.create_many(teams)

        team_ids = [team.id for team in created_teams]
        found_teams = self.repo.get_teams_by_ids(team_ids)

        assert len(found_teams) == 2
