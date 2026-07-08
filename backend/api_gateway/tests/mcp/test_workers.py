from datetime import date
from enum import Enum
from unittest.mock import MagicMock

from shared.schemas.core.worker import (
    SlotRestriction,
    WeeklyPreferences,
    WeekParity,
    Worker,
)
from shared.schemas.core.worker import (
    WeeklySlotPreference as CoreWeeklySlotPreference,
)

from src.mcp.tools.workers import _build_team_members

TEAM_ID = "team_test"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_worker(
    wid: str,
    name: str,
    *,
    start_date: date = date(2025, 1, 15),
    end_date: date | None = None,
    specialty_ids: list[str] | None = None,
    user_id: str | None = None,
    weekly_prefs: WeeklyPreferences | None = None,
) -> Worker:
    return Worker(
        id=wid,
        team_id=TEAM_ID,
        name=name,
        acronym=name[:3].upper(),
        acronym_custom=False,
        employment_start_date=start_date,
        employment_end_date=end_date,
        weekly_hours=40,
        weekly_hours_desired=35,
        duties_per_month=4,
        annual_leave=25,
        specialty_ids=specialty_ids or [],
        deleted=False,
        weekly_preferences=weekly_prefs,
        user_id=user_id,
    )


def _mock_db(workers, specialties, attributes, dimensions, dim_entries):
    db = MagicMock()
    db.worker_db.get_workers_not_deleted.return_value = workers
    db.specialty_db.get_specialties_not_deleted_by_team_id.return_value = specialties
    db.attribute_db.get_attributes_by_owner_ids.return_value = attributes
    db.dimension_db.get_dimensions_not_deleted.return_value = dimensions
    db.dim_entry_db.get_dim_entries_by_dim_ids.return_value = dim_entries
    return db


# Simple stub enums for test dimensions
class _DimEntryType(Enum):
    STR = 0
    INT = 1
    BOOL = 2
    DIM_ENTRIES = 3


class _DimType(Enum):
    WORKER = 0


def _make_dimension(
    did: str,
    name: str,
    entry_type: _DimEntryType,
) -> MagicMock:
    dim = MagicMock()
    dim.id = did
    dim.name = name
    dim.team_id = TEAM_ID
    dim.entry_type = entry_type
    dim.dim_types = [_DimType.WORKER]
    dim.deleted = False
    return dim


def _make_dim_entry(eid: str, name: str) -> MagicMock:
    de = MagicMock()
    de.id = eid
    de.name = name
    de.dimension_id = "dim_loc"
    de.deleted = False
    return de


def _make_attribute(
    aid: str,
    owner_id: str,
    dimension_id: str,
    value: str | int | bool | None = None,
    dim_entry_ids: list[str] | None = None,
) -> MagicMock:
    attr = MagicMock()
    attr.owner_id = owner_id
    attr.owner_type = MagicMock()
    attr.owner_type.value = 1  # WORKER
    attr.dimension_id = dimension_id
    attr.value = value
    attr.dim_entry_ids = dim_entry_ids or []
    return attr


def _make_specialty(sid: str, name: str) -> MagicMock:
    s = MagicMock()
    s.id = sid
    s.name = name
    return s


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestBuildTeamMembers:
    def test_empty_team_returns_empty_list(self):
        db = _mock_db([], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)
        assert result == []

    def test_worker_with_specialties(self):
        worker = _make_worker("w1", "Alice", specialty_ids=["sp1", "sp2"])
        spec1 = _make_specialty("sp1", "Pediatry")
        spec2 = _make_specialty("sp2", "Cardiology")

        db = _mock_db([worker], [spec1, spec2], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert len(result) == 1
        member = result[0]
        assert member.name == "Alice"
        assert "Pediatry" in member.specialties
        assert "Cardiology" in member.specialties
        assert len(member.specialties) == 2

    def test_worker_with_dimension_dropdown_type(self):
        worker = _make_worker("w1", "Alice")
        attr = _make_attribute("a1", "w1", "dim_loc", dim_entry_ids=["de_paris"])
        dim = _make_dimension("dim_loc", "Location", _DimEntryType.DIM_ENTRIES)
        de = _make_dim_entry("de_paris", "Paris")

        db = _mock_db([worker], [], [attr], [dim], [de])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        dims = {d.dimension_name: d for d in member.dimensions}
        assert "Location" in dims
        dv = dims["Location"]
        assert dv.entry_names == ["Paris"]
        assert dv.entry_ids == ["de_paris"]
        assert dv.raw_value is None

    def test_worker_with_dimension_string_type(self):
        worker = _make_worker("w1", "Alice")
        attr = _make_attribute("a1", "w1", "dim_notes", value="Some note")
        dim = _make_dimension("dim_notes", "Notes", _DimEntryType.STR)

        db = _mock_db([worker], [], [attr], [dim], [])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        dims = {d.dimension_name: d for d in member.dimensions}
        assert "Notes" in dims
        dv = dims["Notes"]
        assert dv.raw_value == "Some note"
        assert dv.entry_ids == []
        assert dv.entry_names == []

    def test_worker_with_multiple_dimensions(self):
        worker = _make_worker("w1", "Alice")
        attr1 = _make_attribute("a1", "w1", "dim_loc", dim_entry_ids=["de_paris"])
        attr2 = _make_attribute("a2", "w1", "dim_notes", value="senior")
        dim_loc = _make_dimension("dim_loc", "Location", _DimEntryType.DIM_ENTRIES)
        dim_notes = _make_dimension("dim_notes", "Notes", _DimEntryType.STR)
        de = _make_dim_entry("de_paris", "Paris")

        db = _mock_db([worker], [], [attr1, attr2], [dim_loc, dim_notes], [de])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        assert len(member.dimensions) == 2
        dims = {d.dimension_name: d for d in member.dimensions}
        assert dims["Location"].entry_names == ["Paris"]
        assert dims["Notes"].raw_value == "senior"

    def test_worker_with_employment_dates(self):
        start = date(2024, 3, 1)
        end = date(2026, 12, 31)
        worker = _make_worker("w1", "Bob", start_date=start, end_date=end)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        assert member.employment_start_date == "2024-03-01"
        assert member.employment_end_date == "2026-12-31"

    def test_worker_without_end_date(self):
        worker = _make_worker("w1", "Bob", end_date=None)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        assert member.employment_end_date is None

    def test_worker_with_user_account(self):
        worker = _make_worker("w1", "Bob", user_id="user-abc")

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].has_user_account is True

    def test_worker_without_user_account(self):
        worker = _make_worker("w1", "Bob", user_id=None)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].has_user_account is False

    def test_worker_with_weekly_preferences_enabled(self):
        prefs = WeeklyPreferences(
            enabled=True,
            slots=[
                CoreWeeklySlotPreference(
                    day_of_week=0,
                    slot="morning",
                    restriction=SlotRestriction.NO_WORK,
                    week_parity=WeekParity.ALL,
                ),
                CoreWeeklySlotPreference(
                    day_of_week=3,
                    slot="night",
                    restriction=SlotRestriction.NO_DUTY,
                    week_parity=WeekParity.ALL,
                ),
            ],
        )
        worker = _make_worker("w1", "Alice", weekly_prefs=prefs)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        member = result[0]
        assert member.weekly_preferences is not None
        prefs_out = member.weekly_preferences
        assert len(prefs_out) == 2
        assert prefs_out[0].day_of_week == 0
        assert prefs_out[0].slot == "morning"
        assert prefs_out[0].restriction == "no_work"
        assert prefs_out[1].day_of_week == 3
        assert prefs_out[1].restriction == "no_duty"

    def test_worker_with_weekly_preferences_disabled(self):
        prefs = WeeklyPreferences(enabled=False, slots=[])
        worker = _make_worker("w1", "Alice", weekly_prefs=prefs)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].weekly_preferences is None

    def test_worker_without_weekly_preferences(self):
        worker = _make_worker("w1", "Alice", weekly_prefs=None)

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].weekly_preferences is None

    def test_unknown_specialty_id_falls_back_to_id(self):
        worker = _make_worker("w1", "Alice", specialty_ids=["sp_unknown"])

        db = _mock_db([worker], [], [], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].specialties == ["sp_unknown"]

    def test_dimension_not_found_skipped(self):
        worker = _make_worker("w1", "Alice")
        attr = _make_attribute("a1", "w1", "dim_missing", value="ignored")

        db = _mock_db([worker], [], [attr], [], [])
        result = _build_team_members(db, TEAM_ID)

        assert result[0].dimensions == []
