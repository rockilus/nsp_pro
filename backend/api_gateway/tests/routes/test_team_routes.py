"""
Integration tests for team_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header. These tests cover authz, not authn.
- `team_service_override` used for routes that call Permit.io (create_team,
  get_user_teams) or send notifications (remove_user_from_team), keeping tests
  self-contained.

Role mapping (TEAM_ROLE_TO_AUTHZ_ROLE):
  TeamMembershipRole.OWNER  → Cerbos role "leader"
  TeamMembershipRole.MEMBER → Cerbos role "member"

team.yaml policy summary:
  leader + member → read-team, read-team-users, read-own-worker
  leader only      → update-team, remove-user
  super_admin      → all actions
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.team import Team
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)
from shared.schemas.core.user import Language, User
from shared.schemas.dto.team import (
    MembershipForTeamWithMembershipDTO,
    TeamDTO,
    TeamWithMembershipDTO,
)

from .conftest import dev_headers, make_app

# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

_SIGN_UP_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)
_CREATED_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)


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
    name: str = "Test Team",
    created_by_user_id: str = "system",
) -> Team:
    team = Team(
        id="",
        name=name,
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


def make_mock_team_service() -> MagicMock:
    """
    Build a mock TeamService with async no-ops for methods that call
    Permit.io (create_team, get_user_teams) or send notifications
    (remove_user_from_team).
    """
    mock = MagicMock()
    mock.create_team = AsyncMock(return_value=MagicMock())
    mock.get_user_teams = AsyncMock(return_value=[])
    mock.remove_user_from_team = AsyncMock(return_value=None)
    return mock


# ---------------------------------------------------------------------------
# Tests: POST /teams
# ---------------------------------------------------------------------------


class TestCreateTeam:
    """create_team checks: authz "create-team" on resource "user"."""

    _PAYLOAD = {"team_name": "My New Team"}

    def test_creates_team_when_authorized(
        self, db_interface: DatabaseInterface
    ):
        """Authenticated user with a DB record may create a team."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_create_ok")
        mock_ts = make_mock_team_service()
        mock_ts.create_team = AsyncMock(
            return_value=MagicMock(
                to_dto=lambda: TeamWithMembershipDTO(
                    team=TeamDTO(
                        id="team_new",
                        name="My New Team",
                        createdByUserId="user_create_ok",
                        createdAt=1704067200.0,
                        useSolver=True,
                    ),
                    membership=MembershipForTeamWithMembershipDTO(
                        role="owner"
                    ),
                )
            )
        )
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        try:
            response = client.post(
                "/teams",
                json=self._PAYLOAD,
                headers=dev_headers("user_create_ok"),
            )
            assert response.status_code == 200
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        """AuthzService short-circuits before PDP when requesting user has no DB record."""
        app = make_app(
            db_interface, team_service_override=make_mock_team_service()
        )
        client = TestClient(app)

        response = client.post(
            "/teams",
            json=self._PAYLOAD,
            headers=dev_headers("ghost_user"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /teams
# ---------------------------------------------------------------------------


class TestGetTeams:
    """get_teams checks: authz "read-teams" on resource "user". Uses mock because
    the real service calls Permit.io (authz_role_assignment_get_user_team_ids).
    """

    def test_returns_teams_when_authorized(
        self, db_interface: DatabaseInterface
    ):
        """Authenticated user with a DB record may list teams."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_get_teams_ok")
        app = make_app(
            db_interface, team_service_override=make_mock_team_service()
        )
        client = TestClient(app)

        try:
            response = client.get(
                "/teams", headers=dev_headers("user_get_teams_ok")
            )
            assert response.status_code == 200
            assert response.json() == []
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        """Ghost user → 403 before PDP is consulted."""
        app = make_app(
            db_interface, team_service_override=make_mock_team_service()
        )
        client = TestClient(app)

        response = client.get("/teams", headers=dev_headers("ghost_get_teams"))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /teams/with-memberships
# ---------------------------------------------------------------------------


class TestGetTeamsWithMemberships:
    """get_user_teams_with_memberships checks: authz "read-teams" on resource "user".
    Uses the real service (no external side-effects)."""

    def test_returns_memberships_when_authorized(
        self, db_interface: DatabaseInterface
    ):
        """User with a DB record gets their team memberships."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_twm_ok")
        team = seed_team(db, created_by_user_id="user_twm_ok")
        seed_membership(db, "user_twm_ok", team.id, TeamMembershipRole.OWNER)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                "/teams/with-memberships",
                headers=dev_headers("user_twm_ok"),
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert any(t["team"]["id"] == team.id for t in data)
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.get(
            "/teams/with-memberships",
            headers=dev_headers("ghost_twm"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /teams/{team_id}
# ---------------------------------------------------------------------------


class TestGetTeam:
    """get_team checks: authz "read-team" on resource "team". Real service."""

    def test_returns_team_for_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) may read team details."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gt_member")
        team = seed_team(db)
        seed_membership(
            db, "user_gt_member", team.id, TeamMembershipRole.MEMBER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}", headers=dev_headers("user_gt_member")
            )
            assert response.status_code == 200
            assert response.json()["id"] == team.id
        finally:
            cleanup(db)

    def test_returns_team_for_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may read team details."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gt_leader")
        team = seed_team(db)
        seed_membership(
            db, "user_gt_leader", team.id, TeamMembershipRole.OWNER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}", headers=dev_headers("user_gt_leader")
            )
            assert response.status_code == 200
            assert response.json()["id"] == team.id
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → membership lookup returns None → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gt_outsider")
        team = seed_team(db)
        # No membership seeded
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}", headers=dev_headers("user_gt_outsider")
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.get(
            "/teams/team_gt_any", headers=dev_headers("ghost_gt")
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /teams/{team_id}/users
# ---------------------------------------------------------------------------


class TestGetTeamUsers:
    """get_team_users_with_memberships checks: authz "read-team-users" on resource "team"."""

    def test_returns_users_for_member(self, db_interface: DatabaseInterface):
        """Team member may read the user list."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gtu_member")
        team = seed_team(db)
        seed_membership(
            db, "user_gtu_member", team.id, TeamMembershipRole.MEMBER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}/users",
                headers=dev_headers("user_gtu_member"),
            )
            assert response.status_code == 200
            assert isinstance(response.json(), list)
        finally:
            cleanup(db)

    def test_returns_users_for_leader(self, db_interface: DatabaseInterface):
        """Team owner (leader) may read the user list."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gtu_leader")
        team = seed_team(db)
        seed_membership(
            db, "user_gtu_leader", team.id, TeamMembershipRole.OWNER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}/users",
                headers=dev_headers("user_gtu_leader"),
            )
            assert response.status_code == 200
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gtu_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/teams/{team.id}/users",
                headers=dev_headers("user_gtu_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)


# ---------------------------------------------------------------------------
# Tests: PUT /teams/{team_id}
# ---------------------------------------------------------------------------


class TestUpdateTeam:
    """update_team checks: authz "update-team" on resource "team".
    Only leaders (OWNER role) are allowed by policy. Real service (simple DB write).
    """

    def _team_payload(self, team_id: str) -> dict:
        return {
            "id": team_id,
            "name": "Updated Name",
            "createdByUserId": "system",
            "createdAt": _CREATED_AT.timestamp(),
            "useSolver": True,
        }

    def test_updates_team_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may update the team."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ut_leader")
        team = seed_team(db, created_by_user_id="user_ut_leader")
        seed_membership(
            db, "user_ut_leader", team.id, TeamMembershipRole.OWNER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                f"/teams/{team.id}",
                json=self._team_payload(team.id),
                headers=dev_headers("user_ut_leader"),
            )
            assert response.status_code == 200
            assert response.json()["name"] == "Updated Name"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-team by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ut_member")
        team = seed_team(db)
        seed_membership(
            db, "user_ut_member", team.id, TeamMembershipRole.MEMBER
        )
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                f"/teams/{team.id}",
                json=self._team_payload(team.id),
                headers=dev_headers("user_ut_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_ut_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                f"/teams/{team.id}",
                json=self._team_payload(team.id),
                headers=dev_headers("user_ut_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)


# ---------------------------------------------------------------------------
# Tests: DELETE /teams/{team_id}/leave
# ---------------------------------------------------------------------------


class TestLeaveTeam:
    """leave_team checks: authz "leave-team" on resource "user".

    "leave-team" is in the owner derived-role actions in user.yaml, so any
    authenticated user with a DB record can leave a team they belong to.
    The team_service is mocked because the real implementation sends
    notifications and performs external lookups.
    """

    def test_leaves_team_when_authorized(
        self, db_interface: DatabaseInterface
    ):
        """Authenticated user with a DB record may leave a team."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_lt_member")
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        try:
            # leave-team is checked on the user resource, not team —
            # no membership lookup needed for the authz check itself.
            response = client.delete(
                "/teams/any_team_id/leave",
                headers=dev_headers("user_lt_member"),
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Successfully left the team"
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        """Ghost user → 403 (AuthzService short-circuits before PDP)."""
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        response = client.delete(
            "/teams/team_lt_any/leave",
            headers=dev_headers("ghost_lt"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: DELETE /teams/{team_id}/users/{user_id}
# ---------------------------------------------------------------------------


class TestRemoveUserFromTeam:
    """remove_user_from_team checks: authz "remove-user" on resource "team".
    Only leaders may remove users; members are denied.
    Uses mock service because the real implementation sends notifications."""

    def test_removes_user_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may remove a user."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_rut_leader")
        seed_user(db, "user_rut_target", email="target@example.com")
        team = seed_team(db)
        seed_membership(
            db, "user_rut_leader", team.id, TeamMembershipRole.OWNER
        )
        seed_membership(
            db, "user_rut_target", team.id, TeamMembershipRole.MEMBER
        )
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/teams/{team.id}/users/user_rut_target",
                headers=dev_headers("user_rut_leader"),
            )
            assert response.status_code == 200
            assert (
                response.json()["message"]
                == "User successfully removed from the team"
            )
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied remove-user by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_rut_member")
        seed_user(db, "user_rut_target2", email="target2@example.com")
        team = seed_team(db)
        seed_membership(
            db, "user_rut_member", team.id, TeamMembershipRole.MEMBER
        )
        seed_membership(
            db, "user_rut_target2", team.id, TeamMembershipRole.MEMBER
        )
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/teams/{team.id}/users/user_rut_target2",
                headers=dev_headers("user_rut_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_rut_outsider")
        team = seed_team(db)
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/teams/{team.id}/users/user_rut_target3",
                headers=dev_headers("user_rut_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(
        self, db_interface: DatabaseInterface
    ):
        """Ghost requester → 403."""
        mock_ts = make_mock_team_service()
        app = make_app(db_interface, team_service_override=mock_ts)
        client = TestClient(app)

        response = client.delete(
            "/teams/team_rut_any/users/someone",
            headers=dev_headers("ghost_rut"),
        )
        assert response.status_code == 403
