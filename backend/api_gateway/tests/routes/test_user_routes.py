"""
Integration tests for user_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP (docker containers) started once per session.
- Cerbos runs with the actual policies from cerbos-policies/.
- `get_user_context` overridden to bypass API-key authn; identity is set via
  X-Dev-User-ID header. These tests cover authz, not authn.
- `get_cerbos_authz_service` overridden to create a fresh AsyncCerbosClient per
  make_app() call, avoiding gRPC event-loop reuse issues across TestClient
  instances.
- `get_user_service` overridden for routes that make Cognito calls
  (change-password) to keep tests self-contained.
"""

import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest_asyncio
from cerbos.sdk.grpc.client import AsyncCerbosClient  # type: ignore[import]
from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from shared.database.config import DatabaseConfig, DatabaseType
from shared.database.database_collections import DatabaseCollections
from shared.database.factory import DatabaseFactory
from shared.database.interface import DatabaseInterface
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)
from shared.schemas.core.user import Language, User
from shared.schemas.core.worker import Worker

from src.app import create_app
from src.dependencies.auth_dependencies import get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.dependencies.user_service import get_user_service
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext


# ---------------------------------------------------------------------------
# Session-scoped MongoDB fixture (mirrors shared/database/tests/conftest.py)
# ---------------------------------------------------------------------------

MONGO_PORT = 27019
MONGO_URI = f"mongodb://testuser:testpass@localhost:{MONGO_PORT}/"
MONGO_DB = "api_test_db"

CERBOS_GRPC_HOST = "localhost:3594"
CERBOS_HTTP_HEALTH = "http://localhost:3595/_cerbos/health"


def dev_headers(user_id: str) -> dict:
    """Return the minimum headers for a test request (user identity only)."""
    return {"X-Dev-User-ID": user_id}


@pytest_asyncio.fixture(scope="session")
async def db_interface() -> AsyncGenerator[DatabaseInterface, None]:
    """Spin up (or reuse) a MongoDB container for the test session."""
    if "MONGO_URI" in os.environ:
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=os.environ["MONGO_URI"],
            database_name=MONGO_DB,
        )
        provider = DatabaseFactory.create_provider(config)
        await provider.connect()
        if not await provider.health_check():
            raise ValueError("Failed to connect to MongoDB (CI)")
        try:
            yield provider
        finally:
            await provider.disconnect()
    else:
        compose_file = os.path.join(os.path.dirname(__file__), "docker-compose.yml")
        command = [
            "docker-compose",
            "-f",
            compose_file,
            "up",
            "-d",
            "mongodb-api-tests",
            "cerbos-api-tests",
        ]
        try:
            result = subprocess.run(
                command,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            print(result.stdout.decode("utf-8"))
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"Failed to start containers: {exc.stderr.decode()}"
            ) from exc

        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=MONGO_URI,
            database_name=MONGO_DB,
        )

        provider = None
        for _ in range(5):
            try:
                provider = DatabaseFactory.create_provider(config)
                await provider.connect()
                if await provider.health_check():
                    break
                await provider.disconnect()
                provider = None
            except Exception:  # pylint: disable=broad-except
                pass
            time.sleep(2)

        if provider is None or not await provider.health_check():
            raise RuntimeError("Failed to connect to MongoDB after retries")

        # Wait for Cerbos PDP to be healthy
        for _ in range(15):
            try:
                urllib.request.urlopen(CERBOS_HTTP_HEALTH, timeout=2)  # noqa: S310
                break
            except (urllib.error.URLError, OSError):
                time.sleep(2)
        else:
            raise RuntimeError("Cerbos PDP did not become healthy in time")

        try:
            yield provider
        finally:
            await provider.disconnect()


# ---------------------------------------------------------------------------
# App factory helpers
# ---------------------------------------------------------------------------


def make_app(
    db_interface: DatabaseInterface,
    *,
    user_service_override=None,
) -> FastAPI:
    """
    Create a FastAPI app for testing with:
    - Real DatabaseCollections backed by the test MongoDB.
    - `get_user_context` overridden to bypass API-key authn; identity is
      controlled via X-Dev-User-ID header.
    - Real Cerbos PDP (localhost:3594) with actual policies loaded.
      A fresh AsyncCerbosClient is created per make_app() call to avoid
      gRPC channel / event-loop reuse issues across TestClient instances.
    - Optional override for get_user_service (needed for Cognito-backed routes).
    """
    db_collections = DatabaseCollections(db_interface)
    app = create_app()
    app.state.db_collections = db_collections

    # Override authn: skip API-key validation; read identity from header only
    async def _get_user_context_override(
        x_dev_user_id: str = Header(None, alias="X-Dev-User-ID"),
    ) -> UserContext:
        user_id = x_dev_user_id or "test-user"
        return UserContext(user_id=user_id, email="test@example.com", groups=["user"])

    app.dependency_overrides[get_user_context] = _get_user_context_override

    # Fresh client per make_app() call — avoids singleton event-loop issues.
    # Uses the real Cerbos PDP with actual policies from cerbos-policies/.
    # Must be async: AsyncCerbosClient creates a gRPC channel that needs the
    # running event loop (grpc.aio.insecure_channel) at construction time.
    async def _get_real_authz_service() -> CerbosAuthzService:
        client = AsyncCerbosClient(host=CERBOS_GRPC_HOST, tls_verify=False)
        return CerbosAuthzService(
            client=client,
            user_db=db_collections.user_db,
            team_membership_db=db_collections.team_membership_db,
        )

    app.dependency_overrides[get_cerbos_authz_service] = _get_real_authz_service

    if user_service_override is not None:
        app.dependency_overrides[get_user_service] = lambda: user_service_override

    return app


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
