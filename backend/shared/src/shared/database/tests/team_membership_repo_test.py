import pytest

from shared.database.database import MongoDB
from shared.database.repositories.team_membership import (
    TeamMembershipRepository,
)
from shared.database.schemas.team_membership import TeamMembershipSchema
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)


class TestTeamMembershipRepository:
    repo: TeamMembershipRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = TeamMembershipRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_team_membership(self):
        """Test creating a team membership."""
        membership = TeamMembership(
            id=None,
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER,
        )

        result = self.repo.create_team_membership(membership)

        assert result.id is not None
        assert result.user_id == "user1"
        assert result.team_id == "team1"
        assert result.role == TeamMembershipRole.MEMBER

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["user_id"] == "user1"
        assert saved_doc["team_id"] == "team1"

    def test_get_team_membership_by_id(self):
        """Test getting a team membership by ID."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        created = self.repo.create(membership)

        found = self.repo.get_team_membership_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.user_id == "user1"

    def test_update_team_membership(self):
        """Test updating a team membership."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        created = self.repo.create(membership)

        updated_membership = TeamMembership(
            id=created.id,
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.OWNER,
        )

        result = self.repo.update_team_membership(updated_membership)

        assert result.role == TeamMembershipRole.OWNER

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["role"] == TeamMembershipRole.OWNER.value

    def test_delete_team_membership(self):
        """Test deleting a team membership."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        created = self.repo.create(membership)

        self.repo.delete_team_membership(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_create_team_memberships(self):
        """Test creating multiple team memberships."""
        memberships = [
            TeamMembership(
                id=None,
                user_id="user1",
                team_id="team1",
                role=TeamMembershipRole.MEMBER,
            ),
            TeamMembership(
                id=None,
                user_id="user2",
                team_id="team1",
                role=TeamMembershipRole.OWNER,
            ),
        ]

        results = self.repo.create_team_memberships(memberships)

        assert len(results) == 2
        assert results[0].user_id == "user1"
        assert results[1].user_id == "user2"

    def test_get_team_memberships_by_team_id(self):
        """Test retrieving all team memberships for a team."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        self.repo.create(membership)

        memberships = self.repo.get_team_memberships_by_team_id("team1")
        assert len(memberships) == 1
        assert memberships[0].user_id == "user1"

    def test_get_team_memberships_by_user_id(self):
        """Test retrieving all team memberships for a user."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        self.repo.create(membership)

        memberships = self.repo.get_team_memberships_by_user_id("user1")
        assert len(memberships) == 1
        assert memberships[0].user_id == "user1"
        assert memberships[0].team_id == "team1"

    def test_get_team_membership_by_user_and_team_id(self):
        """Test retrieving a team membership by user ID and team ID."""
        membership = TeamMembershipSchema(
            user_id="user1",
            team_id="team1",
            role=TeamMembershipRole.MEMBER.value,
        )
        self.repo.create(membership)

        found_membership = self.repo.get_team_membership_by_user_and_team_id(
            "user1", "team1"
        )

        assert found_membership is not None
        assert found_membership.user_id == "user1"
        assert found_membership.team_id == "team1"
        assert found_membership.role == TeamMembershipRole.MEMBER
