import math
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List

from shared.schemas import (
    EngineInputs,
    Request,
    RequestStatus,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
)

from core_to_engine_service.build_periods import build_periods_monthly
from core_to_engine_service.calculate_worker_nb_duties import (
    calculate_worker_nb_duties,
    get_nb_days_in_months,
)
from core_to_engine_service.calculate_worker_work_times import (
    calculate_adjustment_coefficients,
    round_proportional_times,
)


# pylint: disable=R0801, too-few-public-methods
class TestCalculateWorkerNbDuties:
    def test_calculate_worker_nb_duties_output_format(
        self, engine_inputs_special_days: EngineInputs
    ) -> None:
        schedule = engine_inputs_special_days.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        out = calculate_worker_nb_duties(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.shifts,
            engine_inputs_special_days.requests,
            engine_inputs_special_days.daily_shift_demands,
            periods_monthly,
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
        self, engine_inputs_special_days: EngineInputs
    ) -> None:
        schedule = engine_inputs_special_days.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

        out = calculate_worker_nb_duties(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.shifts,
            engine_inputs_special_days.requests,
            engine_inputs_special_days.daily_shift_demands,
            periods_monthly,
        )

        # Verify the output
        w_to_desired_per_period: Dict[str, List[int]] = {}
        for worker in engine_inputs_special_days.workers:
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
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        nb_duties_periods: Dict[int, float] = {}
        for i, period in enumerate(periods_monthly):
            dsds_period = [
                dsd
                for dsd in engine_inputs_special_days.daily_shift_demands
                if dsd.date in period and dsd.shift_id in shift_duty_ids
            ]
            nb_duties_periods[i] = sum(dsd.count for dsd in dsds_period)

        w_to_target_per_period: Dict[str, List[float]] = {}
        for worker in engine_inputs_special_days.workers:
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

        for worker in engine_inputs_special_days.workers:
            for i, period in enumerate(periods_monthly):
                assert (
                    out[worker.id]["target"][i]
                    == w_to_target_per_period_rounded[worker.id][i]
                )

    def test_calculate_adjustment_coefficients_no_requests(
        self, engine_inputs_special_days: EngineInputs
    ) -> None:
        schedule = engine_inputs_special_days.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.shifts,
            engine_inputs_special_days.requests,
            periods_monthly,
            ref_nb_days,
        )

        # Verify the output
        for worker in engine_inputs_special_days.workers:
            for i, period in enumerate(periods_monthly):
                expected = len(period) / ref_nb_days[i]
                assert out[worker.id][i] == expected

    def test_calculate_adjustment_coefficients_with_requests(
        self, engine_inputs_special_days: EngineInputs
    ) -> None:
        schedule = engine_inputs_special_days.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        ref_nb_days = get_nb_days_in_months(periods_monthly)

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

        engine_inputs_special_days.shifts.append(shift_leave)

        worker_target_id = engine_inputs_special_days.workers[0].id
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
            status=RequestStatus.PENDING,
        )
        engine_inputs_special_days.requests.append(request_leave)

        out = calculate_adjustment_coefficients(
            schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.shifts,
            engine_inputs_special_days.requests,
            periods_monthly,
            ref_nb_days,
        )

        # Verify the output
        for worker in engine_inputs_special_days.workers:
            for i, period in enumerate(periods_monthly):
                if worker.id == worker_target_id and date_target in period:
                    expected = (len(period) - 1) / ref_nb_days[i]
                else:
                    expected = len(period) / ref_nb_days[i]
                assert out[worker.id][i] == expected
