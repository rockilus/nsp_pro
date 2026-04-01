import math
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List

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
)

from core_to_engine_service.build_dates import build_ws_ids_to_dates
from core_to_engine_service.build_periods import build_periods_weekly
from core_to_engine_service.calculate_worker_work_times import (
    build_work_time_constraints,
    calculate_adjustment_coefficients,
    calculate_worker_work_times,
    round_proportional_times,
)
from engine import GroupsAssignmentsDurationsTargetConstraint
from utils.constants import Constants


# pylint: disable=R0801, too-few-public-methods
class TestCalculateWorkerWorkTimes:
    def test_calculate_worker_work_times_output_format(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        out = calculate_worker_work_times(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_weekly,
        )

        assert isinstance(out, dict)
        assert all(isinstance(v, dict) for v in out.values())
        assert all(isinstance(vv, list) for v in out.values() for vv in v.values())
        assert all(
            isinstance(vvv, int)
            for v in out.values()
            for vv in v.values()
            for vvv in vv
        )
        expected_keys = [
            "contract",
            "desired",
            "max",
            "target",
        ]
        assert all(list(v.keys()) == expected_keys for v in out.values())

    # pylint: disable=too-many-locals
    def test_calculate_worker_work_times_output(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        out = calculate_worker_work_times(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_weekly,
        )

        # Verify the output
        w_to_desired_per_period: Dict[str, List[int]] = {}
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_weekly):
                expected_contract = math.ceil(
                    worker.weekly_hours
                    * Constants.NUM_MINUTES_HOUR
                    * len(period)
                    / Constants.NUM_DAYS_WEEK
                )
                assert out[worker.id]["contract"][i] == expected_contract

                expected_desired = math.ceil(
                    worker.weekly_hours_desired
                    * Constants.NUM_MINUTES_HOUR
                    * len(period)
                    / Constants.NUM_DAYS_WEEK
                )
                assert out[worker.id]["desired"][i] == expected_desired
                if worker.id not in w_to_desired_per_period:
                    w_to_desired_per_period[worker.id] = []
                w_to_desired_per_period[worker.id].append(expected_desired)

                expected_max = math.ceil(
                    200
                    * Constants.NUM_MINUTES_HOUR
                    * len(period)
                    / Constants.NUM_DAYS_WEEK
                )
                assert out[worker.id]["max"][i] == expected_max

        shift_work_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_dict = {shift.id: shift for shift in engine_inputs.shifts}

        work_time_periods: Dict[int, float] = {}
        for i, period in enumerate(periods_weekly):
            dsds_period = [
                dsd
                for dsd in engine_inputs.shift_demands
                if dsd.date in period and dsd.shift_id in shift_work_ids
            ]
            work_time_period = 0.0
            for dsd in dsds_period:
                shift = shift_dict.get(dsd.shift_id, None)
                if shift is None:
                    continue
                shift_duration = max(
                    int(
                        (shift.end_time - shift.start_time).total_seconds()
                        / Constants.NUM_SECONDS_MINUTE
                        - 1
                    ),
                    0,
                )
                work_time_period += shift_duration * dsd.count
            work_time_periods[i] = work_time_period

        w_to_target_per_period: Dict[str, List[float]] = {}
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_weekly):
                total_desired = sum(
                    w_desired_times[i]
                    for w_desired_times in w_to_desired_per_period.values()
                )
                expected_target = (
                    work_time_periods[i]
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
            for i, period in enumerate(periods_weekly):
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
        dates_hist: List[date] = []
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            periods_weekly,
            [Constants.NUM_DAYS_WEEK for _ in periods_weekly],
        )

        # Verify the output
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_weekly):
                expected = len(period) / Constants.NUM_DAYS_WEEK
                assert out[worker.id][i] == expected

    def test_calculate_adjustment_coefficients_with_requests(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)

        shift_leave = Shift(
            id="s_leave_0",
            team_id="t0",
            name="Leave",
            acronym="L",
            acronym_custom=False,
            start_time=datetime(2021, 1, 1, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2021, 1, 2, 0, 0, tzinfo=timezone.utc),
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
            created_at=datetime.now(tz=timezone.utc),
        )
        engine_inputs.requests_leave.append(request_leave)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            periods_weekly,
            [Constants.NUM_DAYS_WEEK for _ in periods_weekly],
        )

        # Verify the output
        for worker in engine_inputs.workers:
            for i, period in enumerate(periods_weekly):
                if worker.id == worker_target_id and date_target in period:
                    expected = (len(period) - 1) / Constants.NUM_DAYS_WEEK
                else:
                    expected = len(period) / Constants.NUM_DAYS_WEEK
                assert out[worker.id][i] == expected

    def test_round_proportional_times_basic(self):
        proportional_times = {
            "worker1": [10.5, 20.3, 30.7],
            "worker2": [15.2, 25.6, 35.1],
            "worker3": [12.3, 22.1, 32.2],
        }
        expected_rounded_times = {
            "worker1": [11, 20, 31],
            "worker2": [15, 26, 35],
            "worker3": [12, 22, 32],
        }
        rounded_times = round_proportional_times(proportional_times)
        assert rounded_times == expected_rounded_times

    def test_round_proportional_times_with_rounding_error(self):
        proportional_times = {
            "worker1": [10.4, 20.3, 30.7],
            "worker2": [15.2, 25.6, 35.1],
            "worker3": [12.3, 22.1, 32.2],
        }
        expected_rounded_times = {
            "worker1": [11, 20, 31],
            "worker2": [15, 26, 35],
            "worker3": [12, 22, 32],
        }
        rounded_times = round_proportional_times(proportional_times)
        assert rounded_times == expected_rounded_times

    def test_round_proportional_times_all_zero(self):
        proportional_times = {
            "worker1": [0.0, 0.0, 0.0],
            "worker2": [0.0, 0.0, 0.0],
            "worker3": [0.0, 0.0, 0.0],
        }
        expected_rounded_times = {
            "worker1": [0, 0, 0],
            "worker2": [0, 0, 0],
            "worker3": [0, 0, 0],
        }
        rounded_times = round_proportional_times(proportional_times)
        assert rounded_times == expected_rounded_times

    def test_round_proportional_times_large_numbers(self):
        proportional_times = {
            "worker1": [1000.5, 2000.3, 3000.7],
            "worker2": [1500.2, 2500.6, 3500.1],
            "worker3": [1200.3, 2200.1, 3200.2],
        }
        expected_rounded_times = {
            "worker1": [1001, 2000, 3001],
            "worker2": [1500, 2501, 3500],
            "worker3": [1200, 2200, 3200],
        }
        rounded_times = round_proportional_times(proportional_times)
        assert rounded_times == expected_rounded_times

    def test_round_proportional_times_negative_numbers(self):
        proportional_times = {
            "worker1": [-10.5, -20.3, -30.7],
            "worker2": [-15.2, -25.6, -35.1],
            "worker3": [-12.3, -22.1, -32.2],
        }
        # Negative proportional times are clamped to 0 by the implementation,
        # so the expected rounded result for all negative inputs is zeros.
        expected_rounded_times = {
            "worker1": [0, 0, 0],
            "worker2": [0, 0, 0],
            "worker3": [0, 0, 0],
        }
        rounded_times = round_proportional_times(proportional_times)
        assert rounded_times == expected_rounded_times

    def test_calculate_worker_work_times_totals(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        out = calculate_worker_work_times(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_weekly,
        )

        w_coef = calculate_adjustment_coefficients(
            schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            periods_weekly,
            [Constants.NUM_DAYS_WEEK for _ in periods_weekly],
        )

        workers = engine_inputs.workers
        shifts = engine_inputs.shifts
        contract_total_expected = sum(
            math.ceil(w.weekly_hours * Constants.NUM_MINUTES_HOUR * w_coef[w.id][i])
            for w in workers
            for i, _ in enumerate(periods_weekly)
        )
        constract_total_actual = sum(
            out[w.id]["contract"][i]
            for w in workers
            for i, _ in enumerate(periods_weekly)
        )
        assert contract_total_expected == constract_total_actual

        desired_total_expected = sum(
            math.ceil(
                w.weekly_hours_desired * Constants.NUM_MINUTES_HOUR * w_coef[w.id][i]
            )
            for w in workers
            for i, _ in enumerate(periods_weekly)
        )
        desired_total_actual = sum(
            out[w.id]["desired"][i]
            for w in workers
            for i, _ in enumerate(periods_weekly)
        )
        assert desired_total_expected == desired_total_actual

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in shifts
        }
        target_total_expected = 0
        for dsd in engine_inputs.shift_demands:
            if dsd.shift_id in s_id_to_duration:
                target_total_expected += dsd.count * s_id_to_duration[dsd.shift_id]
        target_total_actual = sum(
            out[w.id]["target"][i]
            for w in workers
            for i, _ in enumerate(periods_weekly)
        )
        assert target_total_expected == target_total_actual


class TestBuildWorkTimeConstraints:
    def test_build_work_times_constraints_output_format(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_weekly,
        )

        shift_id_to_duration_dict = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs.shifts
        }

        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            engine_inputs.workers,
            [w for w in engine_inputs.workers if not w.deleted],
            engine_inputs.shifts,
            [s for s in engine_inputs.shifts if not s.deleted],
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
            dates_campaign,
        )

        out = build_work_time_constraints(
            periods_weekly,
            w_to_work_times,
            ws_to_dates,
            [
                s
                for s in engine_inputs.shifts
                if not s.deleted and s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
            ],
            shift_id_to_duration_dict,
            # fmt: off
            engine_inputs.penalties.system_constraint.weekly_target_work_time,
            engine_inputs.model_config.system_constraints.weekly_target_worktime_tolerance,
            # fmt: on
        )

        assert isinstance(out, list)
        assert all(
            isinstance(c, GroupsAssignmentsDurationsTargetConstraint) for c in out
        )

    # pylint: disable=too-many-locals
    def test_build_work_times_days_constraints_output(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        schedule = engine_inputs.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.shifts,
            engine_inputs.requests_leave,
            engine_inputs.shift_demands,
            periods_weekly,
        )

        shift_id_to_duration_dict = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs.shifts
        }

        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            engine_inputs.workers,
            [w for w in engine_inputs.workers if not w.deleted],
            engine_inputs.shifts,
            [s for s in engine_inputs.shifts if not s.deleted],
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
            dates_campaign,
        )

        out = build_work_time_constraints(
            periods_weekly,
            w_to_work_times,
            ws_to_dates,
            [
                s
                for s in engine_inputs.shifts
                if not s.deleted and s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
            ],
            shift_id_to_duration_dict,
            # fmt: off
            engine_inputs.penalties.system_constraint.weekly_target_work_time,
            engine_inputs.model_config.system_constraints.weekly_target_worktime_tolerance,
            # fmt: on
        )

        shift_work_not_del_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY] and not s.deleted
        ]

        p_index_to_period = dict(enumerate(periods_weekly))

        for gadtc in out:
            assert (
                gadtc.penalty
                # fmt: off
                == engine_inputs.penalties.system_constraint.weekly_target_work_time
                # fmt: on
            )
            assert (
                gadtc.tolerance
                # fmt: off
                == engine_inputs.model_config.system_constraints.weekly_target_worktime_tolerance
                # fmt: on
            )
            dates_gadtc = list(
                set(date.fromisoformat(a[1]) for ag in gadtc.assignments for a in ag)
            )
            for i, period in p_index_to_period.items():
                if sorted(dates_gadtc) == sorted(period):
                    p_index = i
                    break
            assert p_index is not None
            assert all(d in p_index_to_period[p_index] for d in dates_gadtc)
            shift_ids_gadtc = {a[2] for ag in gadtc.assignments for a in ag}
            assert sorted(shift_ids_gadtc) == sorted(set(shift_work_not_del_ids))
            for assignments, durations, target in zip(
                gadtc.assignments, gadtc.durations, gadtc.targets
            ):
                w_id = assignments[0][0]
                assert w_id in w_to_work_times
                assert all(a[0] == w_id for a in assignments)
                assert target == w_to_work_times[w_id]["target"][p_index]
                assert all(
                    d == shift_id_to_duration_dict[a[2]]
                    for a, d in zip(assignments, durations)
                )
