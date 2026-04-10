"""
Integration tests for dimension_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header. These tests cover authz, not authn.
- `dimension_service_override` used for create_dimension and delete_dimension
  because both cascade to shifts/workers (attribute auto-generation / logical
  deletes), keeping tests self-contained.
- GET and PUT hit the DB directly via `db_collections`; a real seeded Dimension
  is used for those cases.

Role mapping (TEAM_ROLE_TO_AUTHZ_ROLE):
  TeamMembershipRole.OWNER  → Cerbos role "leader"
  TeamMembershipRole.MEMBER → Cerbos role "member"

team.yaml policy summary (dimension actions):
  leader + member → read-dimensions
  leader only      → create-dimension, update-dimension, delete-dimension
  super_admin      → all actions
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
    NewDimension,
)
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


def seed_dimension(
    db: DatabaseCollections,
    team_id: str,
    name: str = "Test Dimension",
) -> Dimension:
    dimension = Dimension(
        id="",
        team_id=team_id,
        dim_types=[DimensionType.WORKER],
        name=name,
        entry_type=DimensionEntryType.STR,
        deleted=False,
    )
    return db.dimension_db.create_dimension(dimension)


def cleanup(db: DatabaseCollections) -> None:
    """Delete all test data from relevant collections."""
    raw_db = db.database_interface.get_database()
    for col_name in ("users", "team_memberships", "teams", "dimensions"):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def make_mock_dimension_service(team_id: str = "team_mock") -> MagicMock:
    """Build a DimensionService mock that returns a valid NewDimension on create."""
    mock_dimension = Dimension(
        id="dim_mock",
        team_id=team_id,
        dim_types=[DimensionType.WORKER],
        name="Mock Dimension",
        entry_type=DimensionEntryType.STR,
        deleted=False,
    )
    mock_new_dimension = NewDimension(
        new_dimension=mock_dimension,
        new_dim_entries=[],
        new_attributes=[],
    )
    mock = MagicMock()
    mock.create_dimension = MagicMock(return_value=mock_new_dimension)
    mock.delete_dimension = MagicMock(return_value=None)
    return mock


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------


def _dimension_payload(team_id: str = "", name: str = "New Dimension") -> dict:
    return {
        "id": "",
        "teamId": team_id,
        "dimTypes": [DimensionType.WORKER.value],
        "name": name,
        "entryType": DimensionEntryType.STR.value,
        "deleted": False,
    }


# ---------------------------------------------------------------------------
# Tests: POST /dimensions/teams/{team_id}
# ---------------------------------------------------------------------------


class TestCreateDimension:
    """create_dimension checks: authz "create-dimension" on resource "team".
    Only leaders are allowed by policy. Uses mock service (avoids cascades).
    """

    def test_creates_dimension_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may create a dimension."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cd_leader")
        team = seed_team(db, created_by_user_id="user_cd_leader")
        seed_membership(db, "user_cd_leader", team.id, TeamMembershipRole.OWNER)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.post(
                f"/dimensions/teams/{team.id}",
                json={
                    "dimension": _dimension_payload(team.id),
                    "dim_entries": [],
                },
                headers=dev_headers("user_cd_leader"),
            )
            assert response.status_code == 200
            mock_ds.create_dimension.assert_called_once()
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied create-dimension by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cd_member")
        team = seed_team(db)
        seed_membership(db, "user_cd_member", team.id, TeamMembershipRole.MEMBER)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.post(
                f"/dimensions/teams/{team.id}",
                json={
                    "dimension": _dimension_payload(team.id),
                    "dim_entries": [],
                },
                headers=dev_headers("user_cd_member"),
            )
            assert response.status_code == 403
            mock_ds.create_dimension.assert_not_called()
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cd_outsider")
        team = seed_team(db)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.post(
                f"/dimensions/teams/{team.id}",
                json={
                    "dimension": _dimension_payload(team.id),
                    "dim_entries": [],
                },
                headers=dev_headers("user_cd_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """AuthzService short-circuits before PDP when requesting user has no DB record."""
        mock_ds = make_mock_dimension_service()
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        response = client.post(
            "/dimensions/teams/any_team",
            json={
                "dimension": _dimension_payload("any_team"),
                "dim_entries": [],
            },
            headers=dev_headers("ghost_cd"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /dimensions/teams/{team_id}
# ---------------------------------------------------------------------------


class TestGetDimensions:
    """get_dimensions checks: authz "read-dimensions" on resource "team".
    Both leaders and members are allowed by policy. Uses real DB collections.
    """

    def test_returns_dimensions_for_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may read dimensions."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gd_leader")
        team = seed_team(db)
        seed_membership(db, "user_gd_leader", team.id, TeamMembershipRole.OWNER)
        seed_dimension(db, team.id, name="Leader Dimension")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/dimensions/teams/{team.id}",
                headers=dev_headers("user_gd_leader"),
            )
            assert response.status_code == 200
            data = response.json()
            assert "dimensions" in data
            assert any(d["name"] == "Leader Dimension" for d in data["dimensions"])
        finally:
            cleanup(db)

    def test_returns_dimensions_for_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) may also read dimensions."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gd_member")
        team = seed_team(db)
        seed_membership(db, "user_gd_member", team.id, TeamMembershipRole.MEMBER)
        seed_dimension(db, team.id, name="Member Dimension")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/dimensions/teams/{team.id}",
                headers=dev_headers("user_gd_member"),
            )
            assert response.status_code == 200
            data = response.json()
            assert "dimensions" in data
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gd_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/dimensions/teams/{team.id}",
                headers=dev_headers("user_gd_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.get(
            "/dimensions/teams/any_team",
            headers=dev_headers("ghost_gd"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: PUT /dimensions/{dimension_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestUpdateDimension:
    """update_dimension checks: authz "update-dimension" on resource "team".
    Only leaders are allowed by policy. Uses real DB (simple update write).
    """

    def test_updates_dimension_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may update a dimension."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ud_leader")
        team = seed_team(db, created_by_user_id="user_ud_leader")
        seed_membership(db, "user_ud_leader", team.id, TeamMembershipRole.OWNER)
        dimension = seed_dimension(db, team.id, name="Original Name")
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dimension.id,
            "teamId": team.id,
            "dimTypes": [DimensionType.WORKER.value],
            "name": "Updated Name",
            "entryType": DimensionEntryType.STR.value,
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dimensions/{dimension.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ud_leader"),
            )
            assert response.status_code == 200
            assert response.json()["name"] == "Updated Name"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-dimension by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ud_member")
        team = seed_team(db)
        seed_membership(db, "user_ud_member", team.id, TeamMembershipRole.MEMBER)
        dimension = seed_dimension(db, team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dimension.id,
            "teamId": team.id,
            "dimTypes": [DimensionType.WORKER.value],
            "name": "Should Not Update",
            "entryType": DimensionEntryType.STR.value,
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dimensions/{dimension.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ud_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ud_outsider")
        team = seed_team(db)
        dimension = seed_dimension(db, team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = {
            "id": dimension.id,
            "teamId": team.id,
            "dimTypes": [DimensionType.WORKER.value],
            "name": "Should Not Update",
            "entryType": DimensionEntryType.STR.value,
            "deleted": False,
        }

        try:
            response = client.put(
                f"/dimensions/{dimension.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_ud_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.put(
            "/dimensions/dim_any/teams/team_any",
            json=_dimension_payload("team_any"),
            headers=dev_headers("ghost_ud"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: DELETE /dimensions/{dimension_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestDeleteDimension:
    """delete_dimension checks: authz "delete-dimension" on resource "team".
    Only leaders are allowed by policy. Uses mock service (cascades to dim_entries
    and attributes).
    """

    def test_deletes_dimension_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may delete a dimension."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dd_leader")
        team = seed_team(db, created_by_user_id="user_dd_leader")
        seed_membership(db, "user_dd_leader", team.id, TeamMembershipRole.OWNER)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dimensions/dim_to_delete/teams/{team.id}",
                headers=dev_headers("user_dd_leader"),
            )
            assert response.status_code == 200
            assert response.json()["message"] == "dimension deleted"
            mock_ds.delete_dimension.assert_called_once_with("dim_to_delete")
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied delete-dimension by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dd_member")
        team = seed_team(db)
        seed_membership(db, "user_dd_member", team.id, TeamMembershipRole.MEMBER)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dimensions/dim_any/teams/{team.id}",
                headers=dev_headers("user_dd_member"),
            )
            assert response.status_code == 403
            mock_ds.delete_dimension.assert_not_called()
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dd_outsider")
        team = seed_team(db)
        mock_ds = make_mock_dimension_service(team.id)
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/dimensions/dim_any/teams/{team.id}",
                headers=dev_headers("user_dd_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        mock_ds = make_mock_dimension_service()
        app = make_app(db_interface, dimension_service_override=mock_ds)
        client = TestClient(app)

        response = client.delete(
            "/dimensions/dim_any/teams/team_any",
            headers=dev_headers("ghost_dd"),
        )
        assert response.status_code == 403
