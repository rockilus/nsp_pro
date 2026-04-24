from datetime import date, datetime

from shared.schemas.core import (
    Shift,
    ShiftDemandNew,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    WorkerDates,
)
from shared.schemas.core.multitasking import (
    MultitaskingGroup,
    MultitaskingGroupType,
)

from core_to_engine_service.build_engine_variables import (
    build_no_overlap_shift_intervals,
)

# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

CAMPAIGN_DATE = date(2025, 1, 6)  # A Monday


def _worker_dates(w_id: str, campaign_dates: list[date] | None = None) -> WorkerDates:
    return WorkerDates(
        dates_hist=[],
        dates_campaign=campaign_dates or [CAMPAIGN_DATE],
    )


def _make_shift(
    shift_id: str,
    shift_type: ShiftType = ShiftType.NORMAL,
    rest_type: ShiftRestType = ShiftRestType.NONE,
    leave_type: ShiftLeaveType = ShiftLeaveType.NONE,
) -> Shift:
    return Shift(
        id=shift_id,
        team_id="t0",
        name=shift_id,
        acronym=shift_id[:3].upper(),
        acronym_custom=False,
        start_time=datetime(2025, 1, 6, 8, 0),
        end_time=datetime(2025, 1, 6, 16, 0),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="blue",
        shift_type=shift_type,
        rest_type=rest_type,
        leave_type=leave_type,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )


def _make_demand(demand_id: str, shift_id: str) -> ShiftDemandNew:
    return ShiftDemandNew(
        id=demand_id,
        date=CAMPAIGN_DATE,
        shift_id=shift_id,
        team_id="t0",
        count=1,
    )


def _make_multitasking_group(
    related_demand_ids: list[str],
) -> MultitaskingGroup:
    return MultitaskingGroup(
        type=MultitaskingGroupType.SHIFT_DEMAND,
        team_id="t0",
        related_ids=related_demand_ids,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1: Type-based filtering
# ─────────────────────────────────────────────────────────────────────────────


class TestLayer1TypeFiltering:
    """DUTY, NORMAL, LEAVE shifts enter no-overlap groups; REST is excluded."""

    def _run(
        self,
        shifts: list[Shift],
        worker_id: str = "w0",
    ) -> list[list[tuple[str, str, str]]]:
        return build_no_overlap_shift_intervals(
            worker_ids_to_worker_dates={worker_id: _worker_dates(worker_id)},
            shifts_not_deleted=shifts,
            worker_not_deleted_ids=[worker_id],
            multitasking_groups=[],
            shift_demands=[],
        )

    def test_normal_shifts_produce_group(self) -> None:
        shifts = [_make_shift("normal_a"), _make_shift("normal_b")]
        groups = self._run(shifts)
        assert len(groups) == 1
        shift_ids_in_group = {t[2] for t in groups[0]}
        assert "normal_a" in shift_ids_in_group
        assert "normal_b" in shift_ids_in_group

    def test_duty_shifts_produce_group(self) -> None:
        shifts = [
            _make_shift("duty_a", shift_type=ShiftType.DUTY),
            _make_shift("duty_b", shift_type=ShiftType.DUTY),
        ]
        groups = self._run(shifts)
        assert len(groups) == 1
        shift_ids = {t[2] for t in groups[0]}
        assert shift_ids == {"duty_a", "duty_b"}

    def test_leave_shifts_produce_group(self) -> None:
        shifts = [
            _make_shift("normal_a"),
            _make_shift("leave_a", shift_type=ShiftType.LEAVE),
        ]
        groups = self._run(shifts)
        assert len(groups) == 1
        shift_ids = {t[2] for t in groups[0]}
        assert "leave_a" in shift_ids

    def test_rest_off_shift_excluded(self) -> None:
        off_shift = _make_shift(
            "off_a", shift_type=ShiftType.REST, rest_type=ShiftRestType.OFF
        )
        normal = _make_shift("normal_a")
        groups = self._run([off_shift, normal])
        assert len(groups) == 1
        shift_ids = {t[2] for t in groups[0]}
        assert "off_a" not in shift_ids
        assert "normal_a" in shift_ids

    def test_rest_recuperation_shift_excluded(self) -> None:
        recup = _make_shift(
            "recup_a",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
        )
        normal = _make_shift("normal_a")
        groups = self._run([recup, normal])
        assert len(groups) == 1
        shift_ids = {t[2] for t in groups[0]}
        assert "recup_a" not in shift_ids
        assert "normal_a" in shift_ids

    def test_only_rest_shifts_produce_no_groups(self) -> None:
        shifts = [
            _make_shift(
                "off_a", shift_type=ShiftType.REST, rest_type=ShiftRestType.OFF
            ),
            _make_shift(
                "recup_a",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
            ),
        ]
        groups = self._run(shifts)
        assert groups == []

    def test_no_shifts_produce_no_groups(self) -> None:
        groups = self._run([])
        assert groups == []

    def test_single_eligible_shift_no_group(self) -> None:
        # One shift alone cannot form a pair → base_ids has 1 element, but the
        # result list still contains that single-element group. The model guard
        # (Phase D) is responsible for skipping single-interval calls.
        shifts = [_make_shift("normal_a")]
        groups = self._run(shifts)
        # One group with 1 tuple (1 worker × 1 date × 1 shift)
        assert len(groups) == 1
        assert len(groups[0]) == 1


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2: MultitaskingGroup-based partitioning
# ─────────────────────────────────────────────────────────────────────────────


class TestLayer2MultitaskingGroups:
    """Shifts in the same group are never in the same AddNoOverlap call."""

    def _run(
        self,
        shifts: list[Shift],
        demands: list[ShiftDemandNew],
        groups: list[MultitaskingGroup],
        worker_id: str = "w0",
    ) -> list[list[tuple[str, str, str]]]:
        return build_no_overlap_shift_intervals(
            worker_ids_to_worker_dates={worker_id: _worker_dates(worker_id)},
            shifts_not_deleted=shifts,
            worker_not_deleted_ids=[worker_id],
            multitasking_groups=groups,
            shift_demands=demands,
        )

    def test_co_grouped_shifts_never_in_same_list(self) -> None:
        """op_1 and op_2 are co-grouped → they must never appear in the same inner list."""
        base = _make_shift("base_a")
        op_1 = _make_shift("op_1")
        op_2 = _make_shift("op_2")

        demand_op_1 = _make_demand("d_op_1", "op_1")
        demand_op_2 = _make_demand("d_op_2", "op_2")

        mg = _make_multitasking_group(["d_op_1", "d_op_2"])

        result = self._run(
            shifts=[base, op_1, op_2],
            demands=[demand_op_1, demand_op_2],
            groups=[mg],
        )

        for inner in result:
            shift_ids = {t[2] for t in inner}
            assert not ("op_1" in shift_ids and "op_2" in shift_ids), (
                f"op_1 and op_2 must NOT be in the same group, but found {shift_ids}"
            )

    def test_grouped_shift_cannot_overlap_base_shift(self) -> None:
        """op_1 and base_a must appear together in some inner list (they cannot overlap)."""
        base = _make_shift("base_a")
        op_1 = _make_shift("op_1")
        op_2 = _make_shift("op_2")

        demand_op_1 = _make_demand("d_op_1", "op_1")
        demand_op_2 = _make_demand("d_op_2", "op_2")

        mg = _make_multitasking_group(["d_op_1", "d_op_2"])

        result = self._run(
            shifts=[base, op_1, op_2],
            demands=[demand_op_1, demand_op_2],
            groups=[mg],
        )

        d = CAMPAIGN_DATE.isoformat()
        pair_base_op1 = ("w0", d, "base_a"), ("w0", d, "op_1")
        pair_base_op2 = ("w0", d, "base_a"), ("w0", d, "op_2")

        def contains_both(inner: list, a: tuple, b: tuple) -> bool:
            return a in inner and b in inner

        assert any(contains_both(g, *pair_base_op1) for g in result), (
            "base_a and op_1 must be in the same no-overlap group"
        )
        assert any(contains_both(g, *pair_base_op2) for g in result), (
            "base_a and op_2 must be in the same no-overlap group"
        )

    def test_cross_group_shifts_cannot_overlap(self) -> None:
        """op_1 (group A) and op_3 (group B) must appear together (cross-group)."""
        op_1 = _make_shift("op_1")
        op_2 = _make_shift("op_2")
        op_3 = _make_shift("op_3")
        op_4 = _make_shift("op_4")

        demands = [
            _make_demand("d_op_1", "op_1"),
            _make_demand("d_op_2", "op_2"),
            _make_demand("d_op_3", "op_3"),
            _make_demand("d_op_4", "op_4"),
        ]
        group_a = _make_multitasking_group(["d_op_1", "d_op_2"])
        group_b = _make_multitasking_group(["d_op_3", "d_op_4"])

        result = self._run(
            shifts=[op_1, op_2, op_3, op_4],
            demands=demands,
            groups=[group_a, group_b],
        )

        d = CAMPAIGN_DATE.isoformat()

        def tup(s: str) -> tuple[str, str, str]:
            return ("w0", d, s)

        def contains_both(inner: list, a: tuple, b: tuple) -> bool:
            return a in inner and b in inner

        # op_1 and op_3 are from different groups → must share a group
        assert any(contains_both(g, tup("op_1"), tup("op_3")) for g in result), (
            "op_1 and op_3 (different groups) must be in the same no-overlap list"
        )

        # op_1's own AddNoOverlap list must NOT contain op_2 (its co-group member).
        # The list where op_1 is the focal shift contains: cross_group [op_3,op_4] + op_1.
        op_1_focal_groups = [
            g for g in result if tup("op_1") in g and tup("op_2") not in g
        ]
        assert len(op_1_focal_groups) >= 1, (
            "op_1 must have at least one group where it appears WITHOUT op_2"
        )

        # Symmetrically for op_3: must appear in a group without op_4
        op_3_focal_groups = [
            g for g in result if tup("op_3") in g and tup("op_4") not in g
        ]
        assert len(op_3_focal_groups) >= 1, (
            "op_3 must have at least one group where it appears WITHOUT op_4"
        )

    def test_no_groups_produces_single_list_per_worker(self) -> None:
        """Without multitasking groups, one list per worker (original behavior)."""
        shifts = [_make_shift("s0"), _make_shift("s1"), _make_shift("s2")]
        result = build_no_overlap_shift_intervals(
            worker_ids_to_worker_dates={
                "w0": _worker_dates("w0"),
                "w1": _worker_dates("w1"),
            },
            shifts_not_deleted=shifts,
            worker_not_deleted_ids=["w0", "w1"],
            multitasking_groups=[],
            shift_demands=[],
        )
        # One base group per worker (no grouped shifts)
        assert len(result) == 2
        for inner in result:
            assert len(inner) == 3  # 1 worker × 1 date × 3 shifts

    def test_shift_demand_template_group_type_ignored(self) -> None:
        """MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE groups are ignored by the engine."""
        op_1 = _make_shift("op_1")
        op_2 = _make_shift("op_2")

        demands = [
            _make_demand("d_op_1", "op_1"),
            _make_demand("d_op_2", "op_2"),
        ]
        template_group = MultitaskingGroup(
            type=MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE,
            team_id="t0",
            related_ids=["d_op_1", "d_op_2"],
        )

        result = self._run(
            shifts=[op_1, op_2],
            demands=demands,
            groups=[template_group],
        )

        # Template groups are ignored → treated as base shifts, one group
        assert len(result) == 1
        shift_ids = {t[2] for t in result[0]}
        assert "op_1" in shift_ids and "op_2" in shift_ids
