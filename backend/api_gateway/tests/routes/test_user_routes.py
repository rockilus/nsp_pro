"""
Integration tests for user_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers started once per session via the
  session-scoped `db_interface` fixture in conftest.py.
- `get_user_context` overridden (via make_app in conftest) to bypass API-key
  authn; identity is controlled via X-Dev-User-ID header.
- `get_user_service` overridden for routes that make Cognito calls
  (change-password) to keep tests self-contained.
"""

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)
from shared.schemas.core.user import Language, User
from shared.schemas.core.worker import Worker

from .conftest import dev_headers, make_app


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

_SIGN_UP_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)
_START_DATE = date(2024, 1, 1)


def seed_user(
    db: DatabaseCollections,
    user_id: str,
    email: str = "user@example.com",
) -> User:
    user = User(
        id=user_id,
        email=email,
        first_name="John",
        last_name="Doe",
        language=Language.EN,
        sign_up_at=_SIGN_UP_AT,
        impersonating_user_id=None,
    )
    return db.user_db.create_user(user)


def seed_membership(
    db: DatabaseCollections,
    user_id: str,
    team_id: str,
    role: TeamMembershipRole = TeamMembershipRole.MEMBER,
) -> TeamMembership:
    membership = TeamMembership(
        id=f"mem_{user_id}_{team_id}",
        user_id=user_id,
        team_id=team_id,
        role=role,
    )
    return db.team_membership_db.create_team_membership(membership)


def seed_worker(
    db: DatabaseCollections,
    worker_id: str,
    team_id: str,
    user_id: str,
) -> Worker:
    worker = Worker(
        id=worker_id,
        team_id=team_id,
        name="John Doe",
        acronym="JD",
        acronym_custom=False,
        employment_start_date=_START_DATE,
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=40,
        duties_per_month=0,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
        user_id=user_id,
    )
    return db.worker_db.create_worker(worker)


def cleanup(db: DatabaseCollections) -> None:
    """Delete all test data from relevant collections."""
    raw_db = db.database_interface.get_database()
    for col_name in ("users", "team_memberships", "workers", "attributes"):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


# ---------------------------------------------------------------------------
# Tests: GET /users/me
# ---------------------------------------------------------------------------


class TestGetCurrentUser:
    def test_returns_user_when_authorized(self, db_interface: DatabaseInterface):
        """Authenticated user can read their own profile — real policy allows."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_alice", email="alice@example.com")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get("/users/me", headers=dev_headers("user_alice"))
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "user_alice"
            assert data["email"] == "alice@example.com"
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """
        AuthzService short-circuits before calling the PDP when the requesting
        user has no DB record — the route must return 403.
        """
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.get("/users/me", headers=dev_headers("ghost_user"))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: PUT /users/{user_id}
# ---------------------------------------------------------------------------


class TestUpdateUser:
    _VALID_PAYLOAD = {
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.com",
        "language": "en",
    }

    def test_updates_own_profile(self, db_interface: DatabaseInterface):
        """User may update their own profile — real policy allows."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_carol", email="carol@example.com")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                "/users/user_carol",
                json=self._VALID_PAYLOAD,
                headers=dev_headers("user_carol"),
            )
            assert response.status_code == 200
            assert response.json()["firstName"] == "Jane"
        finally:
            cleanup(db)

    def test_returns_403_updating_another_users_profile(
        self, db_interface: DatabaseInterface
    ):
        """
        The route guard (effective_user_id != user_id) rejects cross-user updates
        before authz is even consulted.
        """
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dave", email="dave@example.com")
        seed_user(db, "user_eve", email="eve@example.com")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            # Authenticated as dave but attempting to update eve's profile
            response = client.put(
                "/users/user_eve",
                json=self._VALID_PAYLOAD,
                headers=dev_headers("user_dave"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)


# ---------------------------------------------------------------------------
# Tests: GET /users/me/worker/teams/{team_id}
# ---------------------------------------------------------------------------


class TestGetUserWorkerForTeam:
    def test_returns_worker_when_member_with_linked_worker(
        self, db_interface: DatabaseInterface
    ):
        """Team member with a linked worker → 200 with worker payload — real policy allows."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_grace", email="grace@example.com")
        seed_membership(db, "user_grace", "team_1", TeamMembershipRole.MEMBER)
        created_worker = seed_worker(db, "worker_grace", "team_1", "user_grace")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                "/users/me/worker/teams/team_1",
                headers=dev_headers("user_grace"),
            )
            assert response.status_code == 200
            data = response.json()
            assert data is not None
            assert data["id"] == created_worker.id
        finally:
            cleanup(db)

    def test_returns_none_when_member_has_no_worker(
        self, db_interface: DatabaseInterface
    ):
        """
        Team member has no linked worker → 200 with null body
        (user is in the team but no worker record exists for them).
        """
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_henry", email="henry@example.com")
        seed_membership(db, "user_henry", "team_2", TeamMembershipRole.MEMBER)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                "/users/me/worker/teams/team_2",
                headers=dev_headers("user_henry"),
            )
            assert response.status_code == 200
            assert response.json() is None
        finally:
            cleanup(db)

    def test_returns_403_when_no_team_membership(self, db_interface: DatabaseInterface):
        """
        User has no membership in the team → AuthzService short-circuits before
        calling the PDP (membership lookup returns None) → 403.
        """
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_iris", email="iris@example.com")
        # No membership seeded for team_3
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                "/users/me/worker/teams/team_3",
                headers=dev_headers("user_iris"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)


# ---------------------------------------------------------------------------
# Tests: PUT /users/{user_id}/change-password
# ---------------------------------------------------------------------------


class TestChangeUserPassword:
    _VALID_PAYLOAD = {
        "currentPassword": "OldPass1!",
        "newPassword": "NewPass2!",
        "newPasswordConfirm": "NewPass2!",
        "accessToken": "mock_token",
    }

    def _make_mock_user_service(self, db: DatabaseCollections) -> MagicMock:
        """
        Build a mock UserService where change_user_password is a no-op coroutine.
        The service still needs a real `collection` for authz DB lookups that
        happen *before* UserService is called, but the Cognito-backed
        `change_user_password` is replaced with an AsyncMock.
        """
        mock_service = MagicMock()
        mock_service.change_user_password = AsyncMock(return_value=None)
        return mock_service

    def test_changes_password_when_authorized(self, db_interface: DatabaseInterface):
        """Authenticated user can change their own password — real policy allows."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_kate", email="kate@example.com")
        mock_user_service = self._make_mock_user_service(db)
        app = make_app(
            db_interface,
            user_service_override=mock_user_service,
        )
        client = TestClient(app)

        try:
            response = client.put(
                "/users/user_kate/change-password",
                json=self._VALID_PAYLOAD,
                headers=dev_headers("user_kate"),
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Password updated successfully"
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """
        AuthzService short-circuits before calling the PDP when the requesting
        user has no DB record → 403.
        """
        mock_user_service = MagicMock()
        mock_user_service.change_user_password = AsyncMock(return_value=None)
        app = make_app(
            db_interface,
            user_service_override=mock_user_service,
        )
        client = TestClient(app)

        response = client.put(
            "/users/ghost_user/change-password",
            json=self._VALID_PAYLOAD,
            headers=dev_headers("ghost_user"),
        )
        assert response.status_code == 403
