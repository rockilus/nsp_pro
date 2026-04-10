"""
Integration tests for dim_entry_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header. These tests cover authz, not authn.
- `dim_entry_service_override` used for delete_dim_entry because it cascades to
  attribute collections (removes dim_entry_id from all attributes).
- POST and PUT use the real DimEntryService (only validates dimension existence).

Role mapping (TEAM_ROLE_TO_AUTHZ_ROLE):
  TeamMembershipRole.OWNER  → Cerbos role "leader"
  TeamMembershipRole.MEMBER → Cerbos role "member"

team.yaml policy summary (dim-entry actions):
  leader only → create-dim-entry, update-dim-entry, delete-dim-entry
  super_admin → all actions
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.dim_entry import DimEntry
from shared.schemas.core.dimension import Dimension, DimensionEntryType, DimensionType
from shared.schemas.core.team import Team
from shared.schemas.core.team_membership import TeamMembership, TeamMembershipRole
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


def seed_dimension(
    db: DatabaseCollections,
    team_id: str,
) -> Dimension:
    dimension = Dimension(
        id="",
        team_id=team_id,
        dim_types=[DimensionType.WORKER],
        name="Test Dimension",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )
    return db.dimension_db.create_dimension(dimension)


def seed_dim_entry(
    db: DatabaseCollections,
    dimension_id: str,
    name: str = "Test Entry",
) -> DimEntry:
    dim_entry = DimEntry(
        id="",
        dimension_id=dimension_id,
        name=name,
        deleted=False,
    )
    return db.dim_entry_db.create_dim_entry(dim_entry)


def cleanup(db: DatabaseCollections) -> None:
    """Delete all test data from relevant collections."""
    raw_db = db.database_interface.get_database()
    for col_name in ("users", "team_memberships", "teams", "dimensions", "dim_entries"):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def make_mock_dim_entry_service() -> MagicMock:
    """Build a DimEntryService mock that returns a no-op on delete."""
    mock = MagicMock()
    mock.delete_dim_entry = MagicMock(return_value=[])
    return mock


# ---------------------------------------------------------------------------
# Tests: POST /dim-entries/teams/{team_id}
# ---------------------------------------------------------------------------


class TestCreateDimEntry:
    """create_dim_entry checks: authz "create-dim-entry" on resource "team".
    Only leaders are allowed by policy. Uses real DimEntryService (validates
    dimension existence — a real dimension is seeded).
    """

    def test_creates_dim_entry_when_leader(
        self, db_interface: DatabaseInterface
    ):
        """Team owner (Cerbos role: leader) may create a dim entry."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cde_leader")
        team = seed_team(db, created_by_user_id="user_cde_leader")
        seed_membership(db, "user_cde_leader", team.id, TeamMembershipRole.OWNER)
        dimension = seed_dimension(db, team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": "",
            "dimensionId": dimension.id,
            "name": "New Entry",
            "deleted": False,
        }

        try:
            response = client.post(
                f"/dim-entries/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_cde_leader"),
            )
            assert response.status_code == 200
            assert response.json()["name"] == "New Entry"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied create-dim-entry by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cde_member")
        team = seed_team(db)
        seed_membership(db, "user_cde_member", team.id, TeamMembershipRole.MEMBER)
        dimension = seed_dimension(db, team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": "",
            "dimensionId": dimension.id,
            "name": "Rejected Entry",
            "deleted": False,
        }

        try:
            response = client.post(
                f"/dim-entries/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_cde_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cde_outsider")
        team = seed_team(db)
        dimension = seed_dimension(db, team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": "",
            "dimensionId": dimension.id,
            "name": "Rejected Entry",
            "deleted": False,
        }

        try:
            response = client.post(
                f"/dim-entries/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_cde_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.post(
            "/dim-entries/teams/any_team",
            json={"id": "", "dimensionId": "dim_any", "name": "X", "deleted": False},
            headers=dev_headers("ghost_cde"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: PUT /dim-entries/{dim_entry_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestUpdateDimEntry:
    """update_dim_entry checks: authz "update-dim-entry" on resource "team".
    Only leaders are allowed by policy. Uses real DB (simple update write).
    """

    def test_updates_dim_entry_when_leader(
        self, db_interface: DatabaseInterface
    ):
        """Team owner (Cerbos role: leader) may update a dim entry."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ude_leader")
        team = seed_team(db, created_by_user_id="user_ude_leader")
        seed_membership(db, "user_ude_leader", team.id, TeamMembershipRole.OWNER)
        dimension = seed_dimension(db, team.id)
        dim_entry = seed_dim_entry(db, dimension.id, name="Original Entry")
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dim_entry.id,
            "dimensionId": dimension.id,
            "name": "Updated Entry",
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dim-entries/{dim_entry.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ude_leader"),
            )
            assert response.status_code == 200
            assert response.json()["name"] == "Updated Entry"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-dim-entry by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ude_member")
        team = seed_team(db)
        seed_membership(db, "user_ude_member", team.id, TeamMembershipRole.MEMBER)
        dimension = seed_dimension(db, team.id)
        dim_entry = seed_dim_entry(db, dimension.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dim_entry.id,
            "dimensionId": dimension.id,
            "name": "Should Not Update",
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dim-entries/{dim_entry.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ude_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ude_outsider")
        team = seed_team(db)
        dimension = seed_dimension(db, team.id)
        dim_entry = seed_dim_entry(db, dimension.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dim_entry.id,
            "dimensionId": dimension.id,
            "name": "Should Not Update",
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dim-entries/{dim_entry.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ude_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.put(
            "/dim-entries/de_any/teams/team_any",
            json={"id": "de_any", "dimensionId": "dim_any", "name": "X", "deleted": False},
            headers=dev_headers("ghost_ude"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: DELETE /dim-entries/{dim_entry_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestDeleteDimEntry:
    """delete_dim_entry checks: authz "delete-dim-entry" on resource "team".
    Only leaders are allowed by policy. Uses mock service (cascades to attributes).
    """

    def test_deletes_dim_entry_when_leader(
        self, db_interface: DatabaseInterface
    ):
        """Team owner (Cerbos role: leader) may delete a dim entry."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dde_leader")
        team = seed_team(db, created_by_user_id="user_dde_leader")
        seed_membership(db, "user_dde_leader", team.id, TeamMembershipRole.OWNER)
        mock_des = make_mock_dim_entry_service()
        app = make_app(db_interface, dim_entry_service_override=mock_des)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dim-entries/de_to_delete/teams/{team.id}",
                headers=dev_headers("user_dde_leader"),
            )
            assert response.status_code == 200
            assert isinstance(response.json(), list)
            mock_des.delete_dim_entry.assert_called_once_with("de_to_delete")
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied delete-dim-entry by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dde_member")
        team = seed_team(db)
        seed_membership(db, "user_dde_member", team.id, TeamMembershipRole.MEMBER)
        mock_des = make_mock_dim_entry_service()
        app = make_app(db_interface, dim_entry_service_override=mock_des)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dim-entries/de_any/teams/{team.id}",
                headers=dev_headers("user_dde_member"),
            )
            assert response.status_code == 403
            mock_des.delete_dim_entry.assert_not_called()
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dde_outsider")
        team = seed_team(db)
        mock_des = make_mock_dim_entry_service()
        app = make_app(db_interface, dim_entry_service_override=mock_des)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dim-entries/de_any/teams/{team.id}",
                headers=dev_headers("user_dde_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        mock_des = make_mock_dim_entry_service()
        app = make_app(db_interface, dim_entry_service_override=mock_des)
        client = TestClient(app)

        response = client.delete(
            "/dim-entries/de_any/teams/team_any",
            headers=dev_headers("ghost_dde"),
        )
        assert response.status_code == 403
