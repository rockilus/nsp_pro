"""
Integration tests for admin_routes.py — user details and data export.

Strategy:
- Real MongoDB + real Cerbos PDP containers shared via the session-scoped
  `db_interface` fixture in conftest.py.
- `get_user_context` overridden (in make_app) to bypass API-key authn; identity
  is controlled via X-Dev-User-ID header.
- Team data is seeded via SolverTestScenariosService.create_scenario so the
  export round-trip is validated against the canonical fixture shape.

admin.yaml policy summary:
  super_admin only → read-users, export-user-data
"""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from shared.database.database_collections import DatabaseCollections
from shared.database.interface import DatabaseInterface
from shared.schemas.core.team import Team
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)
from shared.schemas.core.user import Language, SystemRole, User

from src.config import config as app_config
from src.services.test_service import (
    EXPORTABLE_DATA_TYPES,
    SolverTestScenariosService,
)

from .conftest import dev_headers, make_app


@pytest.fixture(autouse=True)
def _enforce_admin_authz(monkeypatch):
    """Disable the dev-mode Cerbos bypass for the admin resource so these
    tests exercise the real PDP policy (see CerbosAuthzService.check)."""
    monkeypatch.setattr(app_config, "environment", "test")


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
    system_role: SystemRole | None = None,
) -> User:
    user = User(
        id=user_id,
        email=email,
        first_name="John",
        last_name="Doe",
        language=Language.EN,
        sign_up_at=_SIGN_UP_AT,
        impersonating_user_id=None,
        system_role=system_role,
    )
    return db.user_db.create_user(user)


def seed_team(
    db: DatabaseCollections,
    created_by_user_id: str = "system",
    name: str = "Test Team",
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
    for col_name in (
        "users",
        "team_memberships",
        "teams",
        "specialties",
        "workers",
        "shifts",
        "link_shifts",
        "dimensions",
        "dim_entries",
        "attributes",
        "shift_demand_templates",
        "shift_demands_new",
        "constraint_builds",
        "requests",
        "schedules",
    ):
        try:
            raw_db[col_name].delete_many({})
        except Exception:  # pylint: disable=broad-except
            pass


# ---------------------------------------------------------------------------
# Tests: GET /admin/users/{target_user_id}
# ---------------------------------------------------------------------------


class TestGetUserDetails:
    """get_user_details checks: authz "read-users" on resource "admin".
    Only super_admins are allowed by policy.
    """

    def test_returns_user_and_teams_when_super_admin(
        self, db_interface: DatabaseInterface
    ):
        db = DatabaseCollections(db_interface)
        seed_user(db, "admin_gud", system_role=SystemRole.SUPER_ADMIN)
        target = seed_user(db, "target_gud", email="target@example.com")
        team = seed_team(db, created_by_user_id=target.id)
        seed_membership(db, target.id, team.id, TeamMembershipRole.OWNER)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/admin/users/{target.id}",
                headers=dev_headers("admin_gud"),
            )
            assert response.status_code == 200
            body = response.json()
            assert body["user"]["id"] == target.id
            assert body["user"]["email"] == "target@example.com"
            assert len(body["teams"]) == 1
            assert body["teams"][0]["id"] == team.id
            assert body["teams"][0]["name"] == "Test Team"
            assert body["teams"][0]["role"] == "owner"
        finally:
            cleanup(db)

    def test_returns_403_when_not_super_admin(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_gud_regular")
        target = seed_user(db, "target_gud_2", email="target2@example.com")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                f"/admin/users/{target.id}",
                headers=dev_headers("user_gud_regular"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_404_when_target_missing(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        seed_user(db, "admin_gud_404", system_role=SystemRole.SUPER_ADMIN)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.get(
                "/admin/users/64e9b7f1e13e4a1a9c8b0000",
                headers=dev_headers("admin_gud_404"),
            )
            assert response.status_code == 404
        finally:
            cleanup(db)


# ---------------------------------------------------------------------------
# Tests: POST /admin/users/{target_user_id}/export
# ---------------------------------------------------------------------------


class TestExportUserData:
    """export_user_data checks: authz "export-user-data" on resource "admin".
    Only super_admins are allowed by policy. Exported data must match the
    solver_data.json scenario shape (raw Mongo dicts, string _id).
    """

    def _seed_export_setup(self, db: DatabaseCollections):
        seed_user(db, "admin_exp", system_role=SystemRole.SUPER_ADMIN)
        target = seed_user(db, "target_exp", email="export@example.com")
        team = seed_team(db, created_by_user_id=target.id, name="Export Team")
        seed_membership(db, target.id, team.id, TeamMembershipRole.OWNER)
        test_service = SolverTestScenariosService(db)
        test_service.create_scenario("basic_coverage", team.id)
        return target, team

    def test_exports_selected_data_types(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        try:
            target, team = self._seed_export_setup(db)
            app = make_app(db_interface)
            client = TestClient(app)

            response = client.post(
                f"/admin/users/{target.id}/export",
                json={
                    "selections": [
                        {"teamId": team.id, "dataTypes": ["workers", "shifts"]}
                    ]
                },
                headers=dev_headers("admin_exp"),
            )
            assert response.status_code == 200
            body = response.json()
            assert list(body.keys()) == ["Export Team"]
            team_data = body["Export Team"]
            assert set(team_data.keys()) == {"workers", "shifts"}
            assert len(team_data["workers"]) == 2
            for worker in team_data["workers"]:
                assert isinstance(worker["_id"], str)
                assert worker["team"] == team.id
        finally:
            cleanup(db)

    def test_export_round_trips_through_scenario_loader(
        self, db_interface: DatabaseInterface
    ):
        """Full export must parse back via scenario_data_dict_to_core."""
        db = DatabaseCollections(db_interface)
        try:
            target, team = self._seed_export_setup(db)
            app = make_app(db_interface)
            client = TestClient(app)

            response = client.post(
                f"/admin/users/{target.id}/export",
                json={
                    "selections": [
                        {
                            "teamId": team.id,
                            "dataTypes": list(EXPORTABLE_DATA_TYPES),
                        }
                    ]
                },
                headers=dev_headers("admin_exp"),
            )
            assert response.status_code == 200
            team_data = response.json()["Export Team"]
            assert set(team_data.keys()) == set(EXPORTABLE_DATA_TYPES)

            loaded = SolverTestScenariosService.scenario_data_dict_to_core(
                scenario_data=team_data
            )
            fixture = SolverTestScenariosService(db).load_scenario_data_from_json(
                "basic_coverage"
            )
            assert len(loaded["workers"]) == len(fixture["workers"])
            assert len(loaded["shifts"]) == len(fixture["shifts"])
            assert len(loaded["constraints"]) == len(fixture["constraints"])
            assert len(loaded["requests"]) == len(fixture["requests"])
            assert len(loaded["schedules"]) == len(fixture["schedules"])
            assert {w.name for w in loaded["workers"]} == {
                w["name"] for w in fixture["workers"]
            }
        finally:
            cleanup(db)

    def test_returns_400_for_foreign_team(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        try:
            target, _ = self._seed_export_setup(db)
            foreign_team = seed_team(db, name="Foreign Team")
            app = make_app(db_interface)
            client = TestClient(app)

            response = client.post(
                f"/admin/users/{target.id}/export",
                json={
                    "selections": [
                        {"teamId": foreign_team.id, "dataTypes": ["workers"]}
                    ]
                },
                headers=dev_headers("admin_exp"),
            )
            assert response.status_code == 400
        finally:
            cleanup(db)

    def test_returns_400_for_unknown_data_type(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        try:
            target, team = self._seed_export_setup(db)
            app = make_app(db_interface)
            client = TestClient(app)

            response = client.post(
                f"/admin/users/{target.id}/export",
                json={"selections": [{"teamId": team.id, "dataTypes": ["not_a_type"]}]},
                headers=dev_headers("admin_exp"),
            )
            assert response.status_code == 400
        finally:
            cleanup(db)

    def test_returns_403_when_not_super_admin(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        seed_user(db, "user_exp_regular")
        target = seed_user(db, "target_exp_403")
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                f"/admin/users/{target.id}/export",
                json={"selections": []},
                headers=dev_headers("user_exp_regular"),
            )
            assert response.status_code == 403
        finally:
            cleanup(db)

    def test_returns_404_when_target_missing(self, db_interface: DatabaseInterface):
        db = DatabaseCollections(db_interface)
        seed_user(db, "admin_exp_404", system_role=SystemRole.SUPER_ADMIN)
        app = make_app(db_interface)
        client = TestClient(app)

        try:
            response = client.post(
                "/admin/users/64e9b7f1e13e4a1a9c8b0000/export",
                json={"selections": []},
                headers=dev_headers("admin_exp_404"),
            )
            assert response.status_code == 404
        finally:
            cleanup(db)
