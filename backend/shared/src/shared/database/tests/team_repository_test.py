import pytest

from shared.database.database import MongoDB
from shared.database.repositories.team import TeamRepository
from shared.database.schemas.team import TeamSchema
from shared.schemas.schemas.team import Team


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
            id=None,
            team_members=["member1", "member2"],
            team_leaders=["leader1"],
        )

        result = self.repo.create_team(team)

        assert result.id is not None
        assert result.team_members == ["member1", "member2"]
        assert result.team_leaders == ["leader1"]

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team_members"] == ["member1", "member2"]
        assert saved_doc["team_leaders"] == ["leader1"]

    def test_get_team_by_id(self):
        """Test getting a team by ID."""
        team = TeamSchema(
            team_members=["member1", "member2"],
            team_leaders=["leader1"],
        )
        created = self.repo.create(team)

        found = self.repo.get_team_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_members == ["member1", "member2"]
        assert found.team_leaders == ["leader1"]

    def test_update_team(self):
        """Test updating a team."""
        team = TeamSchema(
            team_members=["member1", "member2"],
            team_leaders=["leader1"],
        )
        created = self.repo.create(team)

        updated_team = Team(
            id=created.id,
            team_members=["member1", "member3"],
            team_leaders=["leader2"],
        )

        result = self.repo.update_team(updated_team)

        assert result.team_members == ["member1", "member3"]
        assert result.team_leaders == ["leader2"]

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["team_members"] == ["member1", "member3"]
        assert from_db["team_leaders"] == ["leader2"]

    def test_delete_team(self):
        """Test deleting a team."""
        team = TeamSchema(
            team_members=["member1", "member2"],
            team_leaders=["leader1"],
        )
        created = self.repo.create(team)

        self.repo.delete_team(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_teams(self):
        """Test getting all teams."""
        teams = [
            TeamSchema(team_members=["member1"], team_leaders=["leader1"]),
            TeamSchema(team_members=["member2"], team_leaders=["leader2"]),
        ]
        self.repo.create_many(teams)

        all_teams = self.repo.get_teams()
        assert len(all_teams) == 2

    def test_get_teams_by_ids(self):
        """Test getting multiple teams by their IDs."""
        teams = [
            TeamSchema(team_members=["member1"], team_leaders=["leader1"]),
            TeamSchema(team_members=["member2"], team_leaders=["leader2"]),
        ]
        created_teams = self.repo.create_many(teams)

        team_ids = [team.id for team in created_teams]
        found_teams = self.repo.get_teams_by_ids(team_ids)

        assert len(found_teams) == 2

    def test_get_teams_by_leader_id(self):
        """Test getting teams by leader ID."""
        teams = [
            TeamSchema(team_members=["member1"], team_leaders=["leader1"]),
            TeamSchema(team_members=["member2"], team_leaders=["leader1"]),
        ]
        self.repo.create_many(teams)

        leader_teams = self.repo.get_teams_by_leader_id("leader1")
        assert len(leader_teams) == 2
