"""Tests for copilot worker write executors (preview vs execute + authz)."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

from shared.schemas.core import Worker

from src.mcp_server.tools import worker_writes
from src.security.user_context import UserContext

TEAM_ID = "team-1"


def _user() -> UserContext:
    return UserContext(user_id="admin-1", email="a@b.com", groups=["user"])


def _worker(wid="w1", name="Alice") -> Worker:
    return Worker(
        id=wid,
        team_id=TEAM_ID,
        name=name,
        acronym="ALI",
        acronym_custom=False,
        employment_start_date=date(2025, 1, 1),
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=35,
        duties_per_month=4,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    )


def _allow() -> AsyncMock:
    c = AsyncMock()
    c.check.return_value = True
    return c


def _deny() -> AsyncMock:
    c = AsyncMock()
    c.check.return_value = False
    return c


class TestCreateWorker:
    async def test_creates_immediately(self):
        db = MagicMock()
        db.worker_db.get_workers_not_deleted.return_value = []
        with patch.object(
            worker_writes.WorkerService,
            "create_worker",
            return_value=(_worker(), []),
        ) as mock_create:
            out = await worker_writes.execute_create_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                team_id=TEAM_ID,
                name="Alice",
                weekly_hours=40,
                weekly_hours_desired=35,
                duties_per_month=4,
                employment_start_date="2025-01-01",
            )
        assert out["status"] == "success"
        mock_create.assert_called_once()

    async def test_denied_does_not_create(self):
        db = MagicMock()
        db.worker_db.get_workers_not_deleted.return_value = []
        with patch.object(worker_writes.WorkerService, "create_worker") as mock_create:
            out = await worker_writes.execute_create_worker(
                db=db,
                user_context=_user(),
                cerbos=_deny(),
                team_id=TEAM_ID,
                name="Alice",
                weekly_hours=40,
                weekly_hours_desired=35,
                duties_per_month=4,
                employment_start_date="2025-01-01",
            )
        assert out["status"] == "error"
        mock_create.assert_not_called()


class TestUpdateWorker:
    async def test_preview_builds_diff_and_does_not_mutate(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with patch.object(worker_writes.WorkerService, "update_worker") as mock_upd:
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="preview",
                worker_id="w1",
                weekly_hours_desired=30,
            )
        assert out["status"] == "pending_confirmation"
        assert out["tier"] == "update"
        change = out["preview"]["changes"][0]
        assert change["field"] == "weekly_hours_desired"
        assert change["old"] == 35
        assert change["new"] == 30
        mock_upd.assert_not_called()

    async def test_execute_preserves_unspecified_fields(self):
        db = MagicMock()
        existing = _worker()
        db.worker_db.get_worker_by_id.return_value = existing
        captured = {}

        def _capture(w):
            captured["worker"] = w
            return w

        with patch.object(
            worker_writes.WorkerService, "update_worker", side_effect=_capture
        ):
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="execute",
                worker_id="w1",
                weekly_hours_desired=30,
            )
        assert out["status"] == "success"
        saved = captured["worker"]
        assert saved.weekly_hours_desired == 30
        assert saved.weekly_hours == 40  # untouched
        assert saved.name == "Alice"  # untouched

    async def test_denied(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        out = await worker_writes.execute_update_worker(
            db=db,
            user_context=_user(),
            cerbos=_deny(),
            mode="preview",
            worker_id="w1",
            weekly_hours_desired=30,
        )
        assert out["status"] == "error"

    async def test_missing_worker(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = None
        out = await worker_writes.execute_update_worker(
            db=db,
            user_context=_user(),
            cerbos=_allow(),
            mode="preview",
            worker_id="nope",
            name="X",
        )
        assert out["status"] == "error"

    async def test_employment_start_date_preview_diff(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with patch.object(worker_writes.WorkerService, "update_worker") as mock_upd:
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="preview",
                worker_id="w1",
                employment_start_date="2024-05-05",
            )
        assert out["status"] == "pending_confirmation"
        changes = out["preview"]["changes"]
        assert len(changes) == 1
        assert changes[0]["field"] == "employment_start_date"
        assert changes[0]["old"] == "2025-01-01"
        assert changes[0]["new"] == "2024-05-05"
        mock_upd.assert_not_called()

    async def test_employment_start_date_execute_sets_value(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        captured = {}

        def _capture(w):
            captured["worker"] = w
            return w

        with patch.object(
            worker_writes.WorkerService, "update_worker", side_effect=_capture
        ):
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="execute",
                worker_id="w1",
                employment_start_date="2024-05-05",
            )
        assert out["status"] == "success"
        assert captured["worker"].employment_start_date == date(2024, 5, 5)

    async def test_start_after_end_rejected_in_preview(self):
        db = MagicMock()
        existing = _worker()
        existing.employment_end_date = date(2025, 6, 1)
        db.worker_db.get_worker_by_id.return_value = existing
        with patch.object(worker_writes.WorkerService, "update_worker") as mock_upd:
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="preview",
                worker_id="w1",
                employment_start_date="2025-12-31",
            )
        assert out["status"] == "error"
        assert "after employment end date" in out["message"]
        mock_upd.assert_not_called()

    async def test_start_after_end_rejected_in_execute(self):
        db = MagicMock()
        existing = _worker()
        existing.employment_end_date = date(2025, 6, 1)
        db.worker_db.get_worker_by_id.return_value = existing
        with patch.object(worker_writes.WorkerService, "update_worker") as mock_upd:
            out = await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="execute",
                worker_id="w1",
                employment_start_date="2025-12-31",
            )
        assert out["status"] == "error"
        mock_upd.assert_not_called()

    async def test_unknown_arg_raises_validation_error(self):
        import pytest
        from pydantic import ValidationError

        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with pytest.raises(ValidationError):
            await worker_writes.execute_update_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="preview",
                worker_id="w1",
                bogus_field="oops",
            )


class TestDeleteWorker:
    async def test_preview_does_not_delete(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with patch.object(worker_writes.WorkerService, "delete_worker") as mock_del:
            out = await worker_writes.execute_delete_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="preview",
                worker_id="w1",
            )
        assert out["status"] == "pending_confirmation"
        assert out["tier"] == "delete"
        mock_del.assert_not_called()

    async def test_execute_soft_deletes(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with patch.object(worker_writes.WorkerService, "delete_worker") as mock_del:
            out = await worker_writes.execute_delete_worker(
                db=db,
                user_context=_user(),
                cerbos=_allow(),
                mode="execute",
                worker_id="w1",
            )
        assert out["status"] == "success"
        mock_del.assert_called_once_with("w1")

    async def test_denied_does_not_delete(self):
        db = MagicMock()
        db.worker_db.get_worker_by_id.return_value = _worker()
        with patch.object(worker_writes.WorkerService, "delete_worker") as mock_del:
            out = await worker_writes.execute_delete_worker(
                db=db,
                user_context=_user(),
                cerbos=_deny(),
                mode="execute",
                worker_id="w1",
            )
        assert out["status"] == "error"
        mock_del.assert_not_called()
