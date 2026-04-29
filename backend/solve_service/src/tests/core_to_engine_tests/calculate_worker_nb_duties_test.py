import math
from datetime import UTC, date, datetime, timedelta

from shared.schemas.core import (
    EngineInputsAugmented,
    FulfillmentStatus,
    Request,
    RequestStatus,
    RequestType,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Worker,
    WorkerDates,
)

from core_to_engine_service.build_dates import build_ws_ids_to_dates
from core_to_engine_service.build_periods import build_periods_monthly
from core_to_engine_service.calculate_worker_nb_duties import (
    build_consecutive_duty_gap_vars,
    build_nb_duties_constraints,
    calculate_auto_gap,
    calculate_worker_nb_duties,
    get_nb_days_in_months,
)
from core_to_engine_service.calculate_worker_work_times import (
    calculate_adjustment_coefficients,
    round_proportional_times,
)
from engine import GroupsAssignmentsTargetConstraint


# pylint: disable=R0801, too-few-public-methods
class TestCalculateWorkerNbDuties:
    def test_calculate_worker_nb_duties_output_format(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []

        # Call the method under test
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        out = calculate_worker_nb_duties(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_monthly,
        )

        assert isinstance(out, dict)
        assert all(isinstance(v, dict) for v in out.values())
        assert all(
            isinstance(vv, list) for v in out.values() for vv in v.values()
        )
        assert all(
            isinstance(vvv, int)
            for v in out.values()
            for vv in v.values()
            for vvv in vv
        )
        expected_keys = ["desired", "max", "target"]
        assert all(list(v.keys()) == expected_keys for v in out.values())

    def test_get_nb_days_in_months(self) -> None:
        periods = [
            [date(2021, 1, 1), date(2021, 1, 2)],
            [date(2021, 2, 1), date(2021, 2, 2), date(2021, 2, 3)],
            [date(2021, 3, 1)],
            [date(2024, 2, 23)],
        ]
        nb_days = get_nb_days_in_months(periods)
        assert nb_days == [31, 28, 31, 29]

    # pylint: disable=too-many-locals
    def test_calculate_worker_nb_duties_output(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []

        # Call the method under test
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

        out = calculate_worker_nb_duties(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_monthly,
        )

        # Verify the output
        w_to_desired_per_period: dict[str, list[int]] = {}
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_monthly):
                expected_desired = math.ceil(
                    worker.duties_per_month * len(period) / ref_nb_days[i]
                )
                assert out[worker.id]["desired"][i] == expected_desired
                if worker.id not in w_to_desired_per_period:
                    w_to_desired_per_period[worker.id] = []
                w_to_desired_per_period[worker.id].append(expected_desired)

                expected_max = math.ceil(80 * len(period) / ref_nb_days[i])
                assert out[worker.id]["max"][i] == expected_max

        shift_duty_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        nb_duties_periods: dict[int, float] = {}
        for i, period in enumerate(periods_monthly):
            dsds_period = [
                dsd
                for dsd in engine_inputs.shift_demands
                if dsd.date in period and dsd.shift_id in shift_duty_ids
            ]
            nb_duties_periods[i] = sum(dsd.count for dsd in dsds_period)

        w_to_target_per_period: dict[str, list[float]] = {}
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_monthly):
                total_desired = sum(
                    w_desired_times[i]
                    for w_desired_times in w_to_desired_per_period.values()
                )
                expected_target = (
                    nb_duties_periods[i]
                    * w_to_desired_per_period[worker.id][i]
                    / total_desired
                )
                if worker.id not in w_to_target_per_period:
                    w_to_target_per_period[worker.id] = []
                w_to_target_per_period[worker.id].append(expected_target)

        w_to_target_per_period_rounded = round_proportional_times(
            w_to_target_per_period
        )

        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_monthly):
                assert (
                    out[worker.id]["target"][i]
                    == w_to_target_per_period_rounded[worker.id][i]
                )

    def test_calculate_adjustment_coefficients_no_requests(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            periods_monthly,
            ref_nb_days,
        )

        # Verify the output
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_monthly):
                expected = len(period) / ref_nb_days[i]
                assert out[worker.id][i] == expected

    def test_calculate_adjustment_coefficients_with_requests(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

        shift_leave = Shift(
            id="s_leave_0",
            team_id="t0",
            name="Leave",
            acronym="L",
            acronym_custom=False,
            start_time=datetime(2021, 1, 1, 0, 0, tzinfo=UTC),
            end_time=datetime(2021, 1, 2, 0, 0, tzinfo=UTC),
            staffing=[],
            color="#000000",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.OFF,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        engine_inputs.shifts.append(shift_leave)

        worker_target_id = engine_inputs.workers[0].id
        date_target = schedule.start_date
        shift_target_id = shift_leave.id

        request_leave = Request(
            id="r0",
            team_id="t0",
            worker_id=worker_target_id,
            start_date=date_target,
            end_date=date_target,
            shift_id=shift_target_id,
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=UTC),
        )
        engine_inputs.requests_leave.append(request_leave)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            periods_monthly,
            ref_nb_days,
        )

        # Verify the output
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_monthly):
                if worker.id == worker_target_id and date_target in period:
                    expected = (len(period) - 1) / ref_nb_days[i]
                else:
                    expected = len(period) / ref_nb_days[i]
                assert out[worker.id][i] == expected


class TestBuildNbDutiesConstraints:
    def test_build_nb_duties_constraints_output_format(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_monthly,
        )

        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            engine_inputs.workers,
            [w for w in engine_inputs.workers if not w.deleted],
            engine_inputs.shifts,
            [s for s in engine_inputs.shifts if not s.deleted],
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
            dates_campaign,
        )

        out = build_nb_duties_constraints(
            periods_monthly,
            w_to_nb_duties,
            ws_to_dates,
            [
                s
                for s in engine_inputs.shifts
                if not s.deleted and s.shift_type == ShiftType.DUTY
            ],
            # fmt: off
            engine_inputs.penalties.system_constraint.monthly_target_nb_duties,
            engine_inputs.model_config.system_constraints.mthly_target_nb_duty_tolerance,
            # fmt: on
        )

        assert isinstance(out, list)
        assert all(
            isinstance(c, GroupsAssignmentsTargetConstraint) for c in out
        )

    # pylint: disable=too-many-locals
    def test_build_nb_duties_constraints_output(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_monthly,
        )

        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            engine_inputs.workers,
            [w for w in engine_inputs.workers if not w.deleted],
            engine_inputs.shifts,
            [s for s in engine_inputs.shifts if not s.deleted],
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
            dates_campaign,
        )

        out = build_nb_duties_constraints(
            periods_monthly,
            w_to_nb_duties,
            ws_to_dates,
            [
                s
                for s in engine_inputs.shifts
                if not s.deleted and s.shift_type == ShiftType.DUTY
            ],
            # fmt: off
            engine_inputs.penalties.system_constraint.monthly_target_nb_duties,
            engine_inputs.model_config.system_constraints.mthly_target_nb_duty_tolerance,
            # fmt: on
        )

        shift_duty_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type == ShiftType.DUTY and not s.deleted
        ]

        p_index_to_period = dict(enumerate(periods_monthly))

        for gadtc in out:
            assert (
                gadtc.penalty
                # fmt: off
                == engine_inputs.penalties.system_constraint.monthly_target_nb_duties
                # fmt: on
            )
            assert (
                gadtc.tolerance
                # fmt: off
                == engine_inputs.model_config.system_constraints.mthly_target_nb_duty_tolerance
                # fmt: on
            )
            dates_gadtc = list(
                set(
                    date.fromisoformat(a[1])
                    for ag in gadtc.assignments
                    for a in ag
                )
            )
            for i, period in p_index_to_period.items():
                if sorted(dates_gadtc) == sorted(period):
                    p_index = i
                    break
            assert p_index is not None
            assert all(d in p_index_to_period[p_index] for d in dates_gadtc)
            shift_ids_gadtc = {a[2] for ag in gadtc.assignments for a in ag}
            assert sorted(shift_ids_gadtc) == sorted(set(shift_duty_ids))
            for assignments, target in zip(gadtc.assignments, gadtc.targets):
                w_id = assignments[0][0]
                assert w_id in w_to_nb_duties
                assert all(a[0] == w_id for a in assignments)
                assert target == w_to_nb_duties[w_id]["target"][p_index]


# ---------------------------------------------------------------------------
# Helpers shared by the gap tests
# ---------------------------------------------------------------------------


def _make_worker(worker_id: str, duties_per_month: int = 6) -> Worker:

    return Worker(
        id=worker_id,
        team_id="t0",
        name=worker_id,
        acronym=worker_id[:2].upper(),
        acronym_custom=False,
        employment_start_date=date(2025, 1, 1),
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=40,
        duties_per_month=duties_per_month,
        annual_leave=20,
        specialty_ids=[],
        deleted=False,
    )


def _make_duty_shift(shift_id: str) -> Shift:
    from shared.schemas.core.shift import Staffing

    return Shift(
        id=shift_id,
        team_id="t0",
        name=shift_id,
        acronym=shift_id[:2].upper(),
        acronym_custom=False,
        start_time=datetime(2025, 1, 1, 20, 0),
        end_time=datetime(2025, 1, 2, 8, 0),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="red",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )


# ---------------------------------------------------------------------------
# Tests for calculate_auto_gap
# ---------------------------------------------------------------------------


class TestCalculateAutoGap:
    """Tests for the per-worker smart gap calculation."""

    def test_basic_two_workers(self) -> None:
        """Two workers, 1 month (30 days), different desired duties.

        Worker A: 6 desired duties  → floor(30 / 7) = 4
        Worker B: 2 desired duties  → floor(30 / 3) = 10
        """
        workers = [_make_worker("wA"), _make_worker("wB")]
        # One 30-day period in the campaign
        periods_monthly: list[list[date]] = [
            [date(2025, 1, 1) + timedelta(days=i) for i in range(30)]
        ]
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {
            "wA": {"desired": [6], "max": [80], "target": [6]},
            "wB": {"desired": [2], "max": [20], "target": [2]},
        }

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        # floor(30 / (6 + 1)) = floor(30/7) = 4
        assert result["wA"] == 4
        # floor(30 / (2 + 1)) = floor(30/3) = 10
        assert result["wB"] == 10

    def test_zero_desired_duties_returns_max_cap(self) -> None:
        """A worker with 0 desired duties should get the maximum cap (14)."""
        workers = [_make_worker("wZ", duties_per_month=0)]
        periods_monthly: list[list[date]] = [
            [date(2025, 1, 1) + timedelta(days=i) for i in range(30)]
        ]
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {
            "wZ": {"desired": [0], "max": [0], "target": [0]},
        }

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        assert result["wZ"] == 14

    def test_max_clamp_applied(self) -> None:
        """A worker with 1 desired duty over a very long campaign is capped at 14."""
        workers = [_make_worker("wSparse")]
        # 200-day campaign → raw gap would be floor(200/2) = 100, clamped to 14
        periods_monthly: list[list[date]] = [
            [date(2025, 1, 1) + timedelta(days=i) for i in range(200)]
        ]
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {
            "wSparse": {"desired": [1], "max": [2], "target": [1]},
        }

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        assert result["wSparse"] == 14

    def test_min_clamp_applied(self) -> None:
        """A worker with very high desired duties is clamped to a minimum gap of 1."""
        workers = [_make_worker("wBusy")]
        # 30-day campaign, 29 desired duties → raw gap = floor(30/30) = 1 → still 1
        # 30 desired duties → floor(30/31) = 0 → clamped to 1
        periods_monthly: list[list[date]] = [
            [date(2025, 1, 1) + timedelta(days=i) for i in range(30)]
        ]
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {
            "wBusy": {"desired": [30], "max": [80], "target": [30]},
        }

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        assert result["wBusy"] == 1

    def test_multi_period_sums_desired_across_periods(self) -> None:
        """Desired duties are summed across all monthly periods.

        Worker: 3 desired duties in Jan + 3 in Feb = 6 total over 59 days.
        gap = floor(59 / (6 + 1)) = floor(59/7) = 8
        """
        workers = [_make_worker("wMulti")]
        jan = [date(2025, 1, 1) + timedelta(days=i) for i in range(31)]
        feb = [date(2025, 2, 1) + timedelta(days=i) for i in range(28)]
        periods_monthly: list[list[date]] = [jan, feb]
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {
            "wMulti": {"desired": [3, 3], "max": [80, 80], "target": [3, 3]},
        }

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        # floor(59 / 7) = 8
        assert result["wMulti"] == 8

    def test_missing_worker_in_nb_duties_falls_back_to_cap(self) -> None:
        """If a worker is not present in w_to_nb_duties, gap should be 14."""
        workers = [_make_worker("wGhost")]
        periods_monthly: list[list[date]] = [
            [date(2025, 1, 1) + timedelta(days=i) for i in range(30)]
        ]
        # Worker not in dict at all
        w_to_nb_duties: dict[str, dict[str, list[int]]] = {}

        result = calculate_auto_gap(workers, w_to_nb_duties, periods_monthly)

        assert result["wGhost"] == 14


# ---------------------------------------------------------------------------
# Tests for build_consecutive_duty_gap_vars — per-worker dict support
# ---------------------------------------------------------------------------


class TestBuildConsecutiveDutyGapVarsPerWorker:
    """Verify that build_consecutive_duty_gap_vars handles a per-worker gap dict."""

    def _build_ws_to_dates(
        self,
        workers: list,
        shifts: list,
        dates_campaign: list[date],
    ) -> dict[tuple[str, str], WorkerDates]:
        """Build a minimal ws_to_dates mapping where every (worker, shift) pair
        can be assigned on every campaign date."""
        return {
            (w.id, s.id): WorkerDates(
                dates_hist=[], dates_campaign=dates_campaign
            )
            for w in workers
            for s in shifts
        }

    def test_per_worker_dict_generates_correct_pairs(self) -> None:
        """Two workers with different gaps should only produce pairs within
        their own gap window.

        Worker A: gap=1  → only (d, d+1) pairs generated
        Worker B: gap=2  → (d, d+1) and (d, d+2) pairs generated
        """
        worker_a = _make_worker("wA")
        worker_b = _make_worker("wB")
        workers = [worker_a, worker_b]

        duty_shift = _make_duty_shift("sd0")

        # Campaign: 3 days so we can reason about all pairs concretely
        dates_campaign = [date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3)]
        ws_to_dates = self._build_ws_to_dates(
            workers, [duty_shift], dates_campaign
        )

        # Per-worker gap dict
        gap_dict: dict[str, int] = {"wA": 1, "wB": 2}

        pairs = build_consecutive_duty_gap_vars(
            workers,
            [duty_shift],
            dates_campaign,
            dates_hist=[],
            ws_to_dates=ws_to_dates,
            min_gap_days=gap_dict,
        )

        # Collect pairs by (worker, date_d, date_next)
        pair_keys: set[tuple[str, str, str]] = set()
        for vars_d, vars_next in pairs:
            for vd in vars_d:
                for vn in vars_next:
                    if vd[0] == vn[0]:  # same worker
                        pair_keys.add((vd[0], vd[1], vn[1]))

        # Worker A with gap=1: only (d, d+1) neighbours
        assert ("wA", "2025-01-01", "2025-01-02") in pair_keys
        assert ("wA", "2025-01-02", "2025-01-03") in pair_keys
        # Worker A should NOT have (d, d+2) pairs
        assert ("wA", "2025-01-01", "2025-01-03") not in pair_keys

        # Worker B with gap=2: both (d, d+1) and (d, d+2) neighbours
        assert ("wB", "2025-01-01", "2025-01-02") in pair_keys
        assert ("wB", "2025-01-01", "2025-01-03") in pair_keys

    def test_scalar_gap_still_works(self) -> None:
        """Passing a scalar int (backward-compatible path) should still work."""
        worker = _make_worker("wScalar")
        duty_shift = _make_duty_shift("sd0")
        dates_campaign = [date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3)]
        ws_to_dates = self._build_ws_to_dates(
            [worker], [duty_shift], dates_campaign
        )

        pairs = build_consecutive_duty_gap_vars(
            [worker],
            [duty_shift],
            dates_campaign,
            dates_hist=[],
            ws_to_dates=ws_to_dates,
            min_gap_days=1,  # scalar — original interface
        )

        pair_keys = {
            (vd[0], vd[1], vn[1])
            for vd_list, vn_list in pairs
            for vd in vd_list
            for vn in vn_list
        }
        assert ("wScalar", "2025-01-01", "2025-01-02") in pair_keys
        # gap=1 → d+2 pairs must NOT be present
        assert ("wScalar", "2025-01-01", "2025-01-03") not in pair_keys
