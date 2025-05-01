from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.team_invitation import (
    TeamInvitationRepository,
)
from shared.database.schemas.team_invitation import TeamInvitationSchema
from shared.schemas.core.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
)


class TestTeamInvitationRepository:
    repo: TeamInvitationRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = TeamInvitationRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_invitation(self):
        """Test creating a team invitation."""
        invitation = TeamInvitation(
            id=None,
            team_id="team1",
            email="test@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc),
        )

        result = self.repo.create_invitation(invitation)

        assert result.id is not None
        assert result.email == "test@example.com"
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["email"] == "test@example.com"

    def test_get_invitation_by_id(self):
        """Test getting a team invitation by ID."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(invitation)

        found = self.repo.get_invitation_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.email == "test@example.com"

    def test_update_invitation(self):
        """Test updating a team invitation."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(invitation)

        updated_invitation = TeamInvitation(
            id=created.id,
            team_id="team1",
            email="updated@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.ACCEPTED,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            expires_at=datetime(2023, 1, 3, tzinfo=timezone.utc),
        )

        result = self.repo.update_invitation(updated_invitation)

        assert result.email == "updated@example.com"
        assert result.status == TeamInvitationStatus.ACCEPTED

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["email"] == "updated@example.com"
        assert from_db["status"] == TeamInvitationStatus.ACCEPTED.value

    def test_delete_invitation(self):
        """Test deleting a team invitation."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(invitation)

        self.repo.delete_invitation(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_invitations_by_team_id(self):
        """Test retrieving all invitations for a team."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(invitation)

        invitations = self.repo.get_invitations_by_team_id("team1")
        assert len(invitations) == 1
        assert invitations[0].email == "test@example.com"
