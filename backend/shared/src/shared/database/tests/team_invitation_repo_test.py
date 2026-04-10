from datetime import datetime, timedelta, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.team_invitation import (
    TeamInvitationRepository,
)
from shared.database.schemas.team_invitation import TeamInvitationSchema
from shared.schemas.core.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
    TeamInvitationType,
)


class TestTeamInvitationRepository:
    repo: TeamInvitationRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = TeamInvitationRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("team_invitations")  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_invitation(self):
        """Test creating a team invitation."""
        invitation = TeamInvitation(
            id=None,
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER,
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
            type=TeamInvitationType.MEMBER.value,
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
            type=TeamInvitationType.MEMBER.value,
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
            type=TeamInvitationType.MEMBER,
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
            type=TeamInvitationType.MEMBER.value,
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
            type=TeamInvitationType.MEMBER.value,
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

    def test_get_pending_invitations_by_email(self):
        """Test retrieving pending invitations by email."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).timestamp(),
        )
        self.repo.create(invitation)

        invitations = self.repo.get_pending_invitations_by_email("test@example.com")
        assert len(invitations) == 1
        assert invitations[0].email == "test@example.com"
        assert invitations[0].status == TeamInvitationStatus.PENDING

    def test_get_invitation_by_token(self):
        """Test retrieving an invitation by token."""
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(invitation)

        found_invitation = self.repo.get_invitation_by_token("token123")
        assert found_invitation is not None
        assert found_invitation.token == "token123"
        assert found_invitation.email == "test@example.com"

        not_found_invitation = self.repo.get_invitation_by_token("invalid_token")
        assert not_found_invitation is None

    def test_get_pending_invitations_by_team_id(self):
        """Test retrieving pending invitations by team ID."""
        # Create a pending invitation that is not expired
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2025, 5, 6, tzinfo=timezone.utc).timestamp(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).timestamp(),
        )
        self.repo.create(invitation)

        # Create an expired invitation
        expired_invitation = TeamInvitationSchema(
            team_id="team1",
            email="expired@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker2",
            token="token456",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2025, 5, 5, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2025, 5, 6, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(expired_invitation)

        # Retrieve pending invitations by team ID
        invitations = self.repo.get_pending_invitations_by_team_id("team1")

        # Assert only the non-expired invitation is returned
        assert len(invitations) == 1
        assert invitations[0].email == "test@example.com"
        assert invitations[0].status == TeamInvitationStatus.PENDING

    def test_get_pending_invitations_by_team_and_email(self):
        """Test retrieving pending invitations by team ID and email."""
        # Create a pending invitation that is not expired
        invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker1",
            token="token123",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2025, 5, 6, tzinfo=timezone.utc).timestamp(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).timestamp(),
        )
        self.repo.create(invitation)

        # Create an expired invitation
        expired_invitation = TeamInvitationSchema(
            team_id="team1",
            email="test@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker2",
            token="token456",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2025, 5, 5, tzinfo=timezone.utc).timestamp(),
            expires_at=datetime(2025, 5, 6, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(expired_invitation)

        # Create a pending invitation for a different email
        different_email_invitation = TeamInvitationSchema(
            team_id="team1",
            email="different@example.com",
            type=TeamInvitationType.MEMBER.value,
            worker_id="worker3",
            token="token789",
            status=TeamInvitationStatus.PENDING.value,
            created_at=datetime(2025, 5, 6, tzinfo=timezone.utc).timestamp(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).timestamp(),
        )
        self.repo.create(different_email_invitation)

        # Retrieve pending invitations by team ID and email
        invitations = self.repo.get_pending_invitations_by_team_and_email(
            "team1", "test@example.com"
        )

        # Assert only the non-expired invitation for the specified email is returned
        assert len(invitations) == 1
        assert invitations[0].email == "test@example.com"
        assert invitations[0].status == TeamInvitationStatus.PENDING
