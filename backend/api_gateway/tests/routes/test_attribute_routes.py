"""
Integration tests for attribute_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header. These tests cover authz, not authn.
- `attribute_service_override` used for all 200 cases because the real
  AttributeService validates shift/worker existence (out of scope for authz tests).

Role mapping (TEAM_ROLE_TO_AUTHZ_ROLE):
  TeamMembershipRole.OWNER  → Cerbos role "leader"
  TeamMembershipRole.MEMBER → Cerbos role "member"

team.yaml policy summary (attribute actions):
  leader only → update-attribute
  super_admin → all actions
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.attribute import Attribute, AttributeOwnerType
from shared.schemas.core.team import Team
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)
from shared.schemas.core.user import Language, User

from .conftest import dev_headers, make_app

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_SIGN_UP_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)
_CREATED_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


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


def seed_team(
    db: DatabaseCollections,
    created_by_user_id: str = "system",
) -> Team:
    team = Team(
        id="",
        name="Test Team",
        created_by_user_id=created_by_user_id,
        created_at=_CREATED_AT,
        use_solver=True,
    )
    return db.team_db.create_team(team)


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


def cleanup(db: DatabaseCollections) -> None:
    """Delete all test data from relevant collections."""
    raw_db = db.database_interface.get_database()
    for col_name in ("users", "team_memberships", "teams"):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def make_mock_attribute_service() -> MagicMock:
    """Build an AttributeService mock that returns a valid Attribute on update."""
    mock_attribute = Attribute(
        id="attr_mock",
        value=False,
        owner_type=AttributeOwnerType.WORKER,
        owner_id="worker_mock",
        dimension_id="dim_mock",
        dim_entry_ids=[],
    )
    mock = MagicMock()
    mock.create_or_update_attribute = MagicMock(return_value=mock_attribute)
    return mock


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------


def _attribute_payload(
    attribute_id: str = "",
    owner_id: str = "worker_mock",
    dimension_id: str = "dim_mock",
) -> dict:
    return {
        "id": attribute_id,
        "value": False,
        "ownerType": AttributeOwnerType.WORKER.value,
        "ownerId": owner_id,
        "dimensionId": dimension_id,
        "dimEntryIds": [],
    }


# ---------------------------------------------------------------------------
# Tests: PUT /attributes/teams/{team_id}
# ---------------------------------------------------------------------------


class TestUpdateAttribute:
    """update_attribute checks: authz "update-attribute" on resource "team".
    Only leaders are allowed by policy. Uses mock service (validates
    shift/worker existence — out of scope for authz tests).
    """

    def test_updates_attribute_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may update an attribute."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ua_leader")
        team = seed_team(db, created_by_user_id="user_ua_leader")
        seed_membership(db, "user_ua_leader", team.id, TeamMembershipRole.OWNER)
        mock_as = make_mock_attribute_service()
        app = make_app(db_interface, attribute_service_override=mock_as)
        client = TestClient(app)

        try:
            response = client.put(
                f"/attributes/teams/{team.id}",
                json=_attribute_payload(),
                headers=dev_headers("user_ua_leader"),
            )
            assert response.status_code == 200
            mock_as.create_or_update_attribute.assert_called_once()
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-attribute by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ua_member")
        team = seed_team(db)
        seed_membership(db, "user_ua_member", team.id, TeamMembershipRole.MEMBER)
        mock_as = make_mock_attribute_service()
        app = make_app(db_interface, attribute_service_override=mock_as)
        client = TestClient(app)

        try:
            response = client.put(
                f"/attributes/teams/{team.id}",
                json=_attribute_payload(),
                headers=dev_headers("user_ua_member"),
            )
            assert response.status_code == 403
            mock_as.create_or_update_attribute.assert_not_called()
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ua_outsider")
        team = seed_team(db)
        mock_as = make_mock_attribute_service()
        app = make_app(db_interface, attribute_service_override=mock_as)
        client = TestClient(app)

        try:
            response = client.put(
                f"/attributes/teams/{team.id}",
                json=_attribute_payload(),
                headers=dev_headers("user_ua_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """AuthzService short-circuits before PDP when requesting user has no DB record."""
        mock_as = make_mock_attribute_service()
        app = make_app(db_interface, attribute_service_override=mock_as)
        client = TestClient(app)

        response = client.put(
            "/attributes/teams/any_team",
            json=_attribute_payload(),
            headers=dev_headers("ghost_ua"),
        )
        assert response.status_code == 403
