import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.team import TeamRepository
from shared.database_pymongo.schemas.team import TeamSchema
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
        team_members_ids = [str(ObjectId()), str(ObjectId())]
        team_leaders_ids = [str(ObjectId())]
        team = Team(
            id=None,
            team_members=team_members_ids,
            team_leaders=team_leaders_ids,
        )

        result = self.repo.create_team(team)

        assert result.id is not None
        assert result.team_members == team_members_ids
        assert result.team_leaders == team_leaders_ids

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team_members"] == [ObjectId(id) for id in team_members_ids]
        assert saved_doc["team_leaders"] == [ObjectId(id) for id in team_leaders_ids]

    def test_get_team_by_id(self):
        """Test getting a team by ID."""
        team_members_oids = [ObjectId(), ObjectId()]
        team_leaders_oids = [ObjectId()]
        team = TeamSchema(
            team_members=team_members_oids,
            team_leaders=team_leaders_oids,
        )
        created = self.repo.create(team)

        found = self.repo.get_team_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_members == [str(id) for id in team_members_oids]
        assert found.team_leaders == [str(id) for id in team_leaders_oids]

    def test_update_team(self):
        """Test updating a team."""
        team_members_oids = [ObjectId(), ObjectId()]
        team_leaders_oids = [ObjectId()]
        team = TeamSchema(
            team_members=team_members_oids,
            team_leaders=team_leaders_oids,
        )
        created = self.repo.create(team)

        team_members_ids = [str(ObjectId()), str(ObjectId())]
        team_leaders_ids = [str(ObjectId())]
        updated_team = Team(
            id=str(created.id),
            team_members=team_members_ids,
            team_leaders=team_leaders_ids,
        )

        result = self.repo.update_team(updated_team)

        assert result.team_members == team_members_ids
        assert result.team_leaders == team_leaders_ids

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["team_members"] == [ObjectId(id) for id in team_members_ids]
        assert from_db["team_leaders"] == [ObjectId(id) for id in team_leaders_ids]

    def test_delete_team(self):
        """Test deleting a team."""
        team_members_oids = [ObjectId(), ObjectId()]
        team_leaders_oids = [ObjectId()]
        team = TeamSchema(
            team_members=team_members_oids,
            team_leaders=team_leaders_oids,
        )
        created = self.repo.create(team)

        self.repo.delete_team(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_teams(self):
        """Test getting all teams."""

        teams = [
            TeamSchema(team_members=[ObjectId()], team_leaders=[ObjectId()]),
            TeamSchema(team_members=[ObjectId()], team_leaders=[ObjectId()]),
        ]
        self.repo.create_many(teams)

        all_teams = self.repo.get_teams()
        assert len(all_teams) == 2

    def test_get_teams_by_ids(self):
        """Test getting multiple teams by their IDs."""
        teams = [
            TeamSchema(team_members=[ObjectId()], team_leaders=[ObjectId()]),
            TeamSchema(team_members=[ObjectId()], team_leaders=[ObjectId()]),
        ]
        created_teams = self.repo.create_many(teams)

        team_ids = [team.id for team in created_teams]
        found_teams = self.repo.get_teams_by_ids(team_ids)

        assert len(found_teams) == 2

    def test_get_teams_by_leader_id(self):
        """Test getting teams by leader ID."""
        leader_oid = ObjectId()
        teams = [
            TeamSchema(team_members=[ObjectId()], team_leaders=[leader_oid]),
            TeamSchema(team_members=[ObjectId()], team_leaders=[leader_oid]),
        ]
        self.repo.create_many(teams)

        leader_teams = self.repo.get_teams_by_leader_id(str(leader_oid))
        assert len(leader_teams) == 2
