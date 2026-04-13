"""
Integration tests for worker_routes.py — authz enforcement.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header. These tests cover authz, not authn.
- Real WorkerService used throughout — it only touches MongoDB, no external
  calls (no Permit.io, no Cognito), so no service mocking is needed.

Role mapping (TEAM_ROLE_TO_AUTHZ_ROLE):
  TeamMembershipRole.OWNER  → Cerbos role "leader"
  TeamMembershipRole.MEMBER → Cerbos role "member"

team.yaml policy summary:
  leader + member → read-workers
  leader only      → create-worker, update-worker, delete-worker
  super_admin      → all actions

All worker endpoints check: authz.check(user_id, action, "team", team_id)
"""

from datetime import date, datetime, timezone

from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.team import Team
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
_CREATED_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)
_START_DATE = date(2024, 1, 1)
# Unix timestamp for _START_DATE (2024-01-01 00:00:00 UTC)
_START_DATE_TS = 1704067200.0


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


def seed_worker(
    db: DatabaseCollections,
    worker_id: str,
    team_id: str,
    user_id: str | None = None,
) -> Worker:
    worker = Worker(
        id=worker_id,
        team_id=team_id,
        name="Jane Worker",
        acronym="JW",
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
    for col_name in ("users", "team_memberships", "teams", "workers", "attributes"):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


def _worker_dto_payload(worker_id: str, team_id: str) -> dict:
    """Return a valid WorkerDTO dict for POST / PUT request bodies."""
    return {
        "id": worker_id,
        "teamId": team_id,
        "name": "Jane Worker",
        "acronym": "JW",
        "acronymCustom": False,
        "employmentStartDate": _START_DATE_TS,
        "employmentEndDate": None,
        "weeklyHours": 40,
        "weeklyHoursDesired": 40,
        "dutiesPerMonth": 0,
        "annualLeave": 25,
        "deleted": False,
        "specialtyIds": [],
        "userId": None,
        "attributes": [],
    }


# ---------------------------------------------------------------------------
# Tests: POST /workers/teams/{team_id}
# ---------------------------------------------------------------------------


class TestCreateWorker:
    """create_worker checks: authz "create-worker" on resource "team".
    Only leaders (OWNER role) are allowed by policy."""

    def test_creates_worker_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may create a worker."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cw_leader")
        team = seed_team(db, created_by_user_id="user_cw_leader")
        seed_membership(db, "user_cw_leader", team.id, TeamMembershipRole.OWNER)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/teams/{team.id}",
                json=_worker_dto_payload("worker_cw_new", team.id),
                headers=dev_headers("user_cw_leader"),
            )
            assert response.status_code == 200
            data = response.json()
            assert data["teamId"] == team.id
            assert data["name"] == "Jane Worker"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied create-worker by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cw_member")
        team = seed_team(db)
        seed_membership(db, "user_cw_member", team.id, TeamMembershipRole.MEMBER)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/teams/{team.id}",
                json=_worker_dto_payload("worker_cw_denied", team.id),
                headers=dev_headers("user_cw_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → membership lookup returns None → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_cw_outsider")
        team = seed_team(db)
        # No membership seeded
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/teams/{team.id}",
                json=_worker_dto_payload("worker_cw_outsider", team.id),
                headers=dev_headers("user_cw_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """Ghost user → AuthzService short-circuits before PDP → 403."""
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.post(
            "/workers/teams/team_cw_any",
            json=_worker_dto_payload("worker_cw_ghost", "team_cw_any"),
            headers=dev_headers("ghost_cw"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: GET /workers/teams/{team_id}
# ---------------------------------------------------------------------------


class TestGetWorkers:
    """get_workers checks: authz "read-workers" on resource "team".
    Both leaders and members are allowed by policy."""

    def test_returns_workers_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may read the workers list."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gw_leader")
        team = seed_team(db)
        seed_membership(db, "user_gw_leader", team.id, TeamMembershipRole.OWNER)
        seeded = seed_worker(db, "worker_gw_1", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/workers/teams/{team.id}",
                headers=dev_headers("user_gw_leader"),
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert any(w["id"] == seeded.id for w in data)
        finally:
            cleanup(db)

    def test_returns_workers_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) may read the workers list."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gw_member")
        team = seed_team(db)
        seed_membership(db, "user_gw_member", team.id, TeamMembershipRole.MEMBER)
        seed_worker(db, "worker_gw_2", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/workers/teams/{team.id}",
                headers=dev_headers("user_gw_member"),
            )
            assert response.status_code == 200
            assert isinstance(response.json(), list)
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gw_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/workers/teams/{team.id}",
                headers=dev_headers("user_gw_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """Ghost user → 403."""
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.get(
            "/workers/teams/team_gw_any",
            headers=dev_headers("ghost_gw"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: PUT /workers/{worker_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestUpdateWorker:
    """update_worker checks: authz "update-worker" on resource "team".
    Only leaders (OWNER role) are allowed by policy.

    Note: the path {worker_id} is not consumed by the handler; the worker id
    comes from the WorkerDTO body (worker.id). Both must refer to the same
    seeded worker for the DB update to succeed.
    """

    def test_updates_worker_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may update a worker."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_uw_leader")
        team = seed_team(db)
        seed_membership(db, "user_uw_leader", team.id, TeamMembershipRole.OWNER)
        seeded = seed_worker(db, "worker_uw_1", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        payload = _worker_dto_payload(seeded.id, team.id)
        payload["name"] = "Updated Name"
        payload["acronym"] = "UN"

        try:
            response = client.put(
                f"/workers/{seeded.id}/teams/{team.id}",
                json=payload,
                headers=dev_headers("user_uw_leader"),
            )
            assert response.status_code == 200
            assert response.json()["name"] == "Updated Name"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-worker by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_uw_member")
        team = seed_team(db)
        seed_membership(db, "user_uw_member", team.id, TeamMembershipRole.MEMBER)
        seed_worker(db, "worker_uw_2", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                f"/workers/worker_uw_2/teams/{team.id}",
                json=_worker_dto_payload("worker_uw_2", team.id),
                headers=dev_headers("user_uw_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_uw_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.put(
                f"/workers/worker_uw_any/teams/{team.id}",
                json=_worker_dto_payload("worker_uw_any", team.id),
                headers=dev_headers("user_uw_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """Ghost user → 403."""
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.put(
            "/workers/worker_uw_ghost/teams/team_uw_any",
            json=_worker_dto_payload("worker_uw_ghost", "team_uw_any"),
            headers=dev_headers("ghost_uw"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: POST /workers/{worker_id}/attach_user/teams/{team_id}
# ---------------------------------------------------------------------------


class TestAttachUserToWorker:
    """attach_user_to_worker checks: authz "update-worker" on resource "team".
    Only leaders (OWNER role) are allowed by policy.

    Success case: seed a worker with no user_id, then leader attaches a second
    seeded user to that worker.
    """

    def test_attaches_user_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may attach a user to a worker."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_au_leader")
        seed_user(db, "user_au_target", email="target_au@example.com")
        team = seed_team(db)
        seed_membership(db, "user_au_leader", team.id, TeamMembershipRole.OWNER)
        seeded = seed_worker(db, "worker_au_1", team.id, user_id=None)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/{seeded.id}/attach_user/teams/{team.id}",
                json={"user_id": "user_au_target"},
                headers=dev_headers("user_au_leader"),
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert any(w["userId"] == "user_au_target" for w in data)
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied update-worker by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_au_member")
        team = seed_team(db)
        seed_membership(db, "user_au_member", team.id, TeamMembershipRole.MEMBER)
        seed_worker(db, "worker_au_2", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/worker_au_2/attach_user/teams/{team.id}",
                json={"user_id": "user_au_member"},
                headers=dev_headers("user_au_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_au_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/workers/worker_au_any/attach_user/teams/{team.id}",
                json={"user_id": "user_au_outsider"},
                headers=dev_headers("user_au_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """Ghost user → 403."""
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.post(
            "/workers/worker_au_ghost/attach_user/teams/team_au_any",
            json={"user_id": "ghost_au"},
            headers=dev_headers("ghost_au"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tests: DELETE /workers/{worker_id}/teams/{team_id}
# ---------------------------------------------------------------------------


class TestDeleteWorker:
    """delete_worker checks: authz "delete-worker" on resource "team".
    Only leaders (OWNER role) are allowed by policy.

    Note: WorkerService.delete_worker performs a logical delete (sets
    deleted=True) rather than a hard DB removal.
    """

    def test_deletes_worker_when_leader(self, db_interface: DatabaseInterface):
        """Team owner (Cerbos role: leader) may delete a worker."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dw_leader")
        team = seed_team(db)
        seed_membership(db, "user_dw_leader", team.id, TeamMembershipRole.OWNER)
        seeded = seed_worker(db, "worker_dw_1", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/workers/{seeded.id}/teams/{team.id}",
                headers=dev_headers("user_dw_leader"),
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Worker deleted"
        finally:
            cleanup(db)

    def test_returns_403_when_member(self, db_interface: DatabaseInterface):
        """Team member (Cerbos role: member) is denied delete-worker by policy."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dw_member")
        team = seed_team(db)
        seed_membership(db, "user_dw_member", team.id, TeamMembershipRole.MEMBER)
        seed_worker(db, "worker_dw_2", team.id)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/workers/worker_dw_2/teams/{team.id}",
                headers=dev_headers("user_dw_member"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_for_non_member(self, db_interface: DatabaseInterface):
        """User in DB but not in team → 403."""
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_dw_outsider")
        team = seed_team(db)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.delete(
                f"/workers/worker_dw_any/teams/{team.id}",
                headers=dev_headers("user_dw_outsider"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_403_when_user_not_in_db(self, db_interface: DatabaseInterface):
        """Ghost user → 403."""
        app = make_app(db_interface)
        client = TestClient(app)

        response = client.delete(
            "/workers/worker_dw_ghost/teams/team_dw_any",
            headers=dev_headers("ghost_dw"),
        )
        assert response.status_code == 403
