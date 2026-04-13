"""
Shared fixtures and helpers for route integration tests.

Provides:
- `db_interface` — session-scoped MongoDB + Cerbos PDP containers (or CI env vars).
- `make_app()` — FastAPI app factory with authn bypassed and real Cerbos PDP wired.
- `dev_headers()` — build request headers from a user ID.
"""

import os
import subprocess
import time
import urllib.error
import urllib.request
from typing import AsyncGenerator

import pytest_asyncio
from cerbos.sdk.grpc.client import AsyncCerbosClient  # type: ignore[import]
from fastapi import FastAPI, Header
from shared.database.config import DatabaseConfig, DatabaseType
from shared.database.database_collections import DatabaseCollections
from shared.database.factory import DatabaseFactory
from shared.database.interface import DatabaseInterface

from src.app import create_app
from src.dependencies.attribute_service import get_attribute_service
from src.dependencies.auth_dependencies import get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.dependencies.dim_entry_service import get_dim_entry_service
from src.dependencies.dimension_service import get_dimension_service
from src.dependencies.team_service import get_team_service
from src.dependencies.user_service import get_user_service
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext

# ---------------------------------------------------------------------------
# Infrastructure constants
# ---------------------------------------------------------------------------

MONGO_PORT = 27019
MONGO_URI = f"mongodb://testuser:testpass@localhost:{MONGO_PORT}/"
MONGO_DB = "api_test_db"

CERBOS_GRPC_HOST = "localhost:3594"
CERBOS_HTTP_HEALTH = "http://localhost:3595/_cerbos/health"


# ---------------------------------------------------------------------------
# Session-scoped MongoDB + Cerbos fixture
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def db_interface() -> AsyncGenerator[DatabaseInterface, None]:
    """Spin up (or reuse) MongoDB and Cerbos PDP containers for the test session."""
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
        compose_file = os.path.join(
            os.path.dirname(__file__), "docker-compose.yml"
        )
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
                urllib.request.urlopen(
                    CERBOS_HTTP_HEALTH, timeout=2
                )  # noqa: S310
                break
            except (urllib.error.URLError, OSError):
                time.sleep(2)
        else:
            raise RuntimeError("Cerbos PDP did not become healthy in time")

        try:
            yield provider
        finally:
            await provider.disconnect()
            subprocess.run(
                ["docker-compose", "-f", compose_file, "down", "-v"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def make_app(
    database_interface: DatabaseInterface,
    *,
    user_service_override=None,
    team_service_override=None,
    dimension_service_override=None,
    dim_entry_service_override=None,
    attribute_service_override=None,
) -> FastAPI:
    """
    Create a FastAPI app for testing with:
    - Real DatabaseCollections backed by the test MongoDB.
    - `get_user_context` overridden to bypass API-key authn; identity is
      controlled via X-Dev-User-ID header.
    - Real Cerbos PDP (localhost:3594) with actual policies loaded.
      A fresh AsyncCerbosClient is created per make_app() call to avoid
      gRPC channel / event-loop reuse issues across TestClient instances.
    - Optional `user_service_override` for Cognito-backed routes.
    - Optional `team_service_override` for routes that call Permit.io or
      send notifications (create_team, get_user_teams, remove_user_from_team).
    - Optional `dimension_service_override` for routes that cascade to
      shifts/workers (create_dimension, delete_dimension).
    - Optional `dim_entry_service_override` for routes that cascade to
      attribute collections (delete_dim_entry).
    - Optional `attribute_service_override` for routes that validate
      shift/worker existence (update_attribute).
    """
    db_collections = DatabaseCollections(database_interface)
    app = create_app()
    app.state.db_collections = db_collections

    # Override authn: skip API-key validation; read identity from header only
    async def _get_user_context_override(
        x_dev_user_id: str = Header(None, alias="X-Dev-User-ID"),
    ) -> UserContext:
        user_id = x_dev_user_id or "test-user"
        return UserContext(
            user_id=user_id, email="test@example.com", groups=["user"]
        )

    app.dependency_overrides[get_user_context] = _get_user_context_override

    # Fresh client per make_app() call — avoids singleton event-loop issues.
    # Uses the real Cerbos PDP with actual policies from cerbos-policies/.
    async def _get_real_authz_service() -> CerbosAuthzService:
        client = AsyncCerbosClient(host=CERBOS_GRPC_HOST, tls_verify=False)
        return CerbosAuthzService(
            client=client,
            user_db=db_collections.user_db,
            team_membership_db=db_collections.team_membership_db,
        )

    app.dependency_overrides[get_cerbos_authz_service] = (
        _get_real_authz_service
    )

    if user_service_override is not None:
        app.dependency_overrides[get_user_service] = (
            lambda: user_service_override
        )

    if team_service_override is not None:
        app.dependency_overrides[get_team_service] = (
            lambda: team_service_override
        )

    if dimension_service_override is not None:
        app.dependency_overrides[get_dimension_service] = lambda: (
            dimension_service_override
        )

    if dim_entry_service_override is not None:
        app.dependency_overrides[get_dim_entry_service] = lambda: (
            dim_entry_service_override
        )

    if attribute_service_override is not None:
        app.dependency_overrides[get_attribute_service] = lambda: (
            attribute_service_override
        )

    return app


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------


def dev_headers(user_id: str) -> dict:
    """Return the minimum headers for a test request (user identity only)."""
    return {"X-Dev-User-ID": user_id}
