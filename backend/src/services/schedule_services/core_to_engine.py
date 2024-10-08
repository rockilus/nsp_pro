import calendar
import math
from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import (
    Assignment,
    Constraint,
    Request,
    Shift,
    ShiftDemandDate,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    VarDay,
    VarShift,
    VarWorker,
    Worker,
)
from engine import Constraint as ConstraintEngine
from engine import Coverage as CoverageEngine
from engine import FixedConfig as FixedConfigEngine
from engine import Inputs
from engine import PeriodTarget as PeriodTargetEngine
from engine import Request as RequestEngine
from engine import ShiftDemand as ShiftDemandEngine
from engine import VarDay as VarDayEngine
from engine import VariableSpace
from engine import VarShift as VarShiftEngine
from engine import VarWorker as VarWorkerEngine
from engine import Worker as WorkerEngine
from services.schedule_services.penalty_map import penalty_map
from utils.constants import Constants


# pylint: disable=too-many-arguments, too-many-locals
def core_to_engine_inputs(
    workers: List[Worker],
    start_date: date,
    end_date: date,
    shifts: List[Shift],
    shift_demand_dates: List[ShiftDemandDate],
    requests: List[Request],
    constraints: List[Constraint],
    fixed_assignments: List[Assignment],
    wip_assignments: List[Assignment],
) -> Inputs:
    start_date_hist = min(
        (min(a.date for a in fixed_assignments) if fixed_assignments else start_date),
        start_date,
    )
    end_date_hist = start_date - timedelta(days=1)
    dates_all = _build_dates(start_date_hist, end_date)
    dates_hist = _build_dates(start_date_hist, end_date_hist)
    dates_campaign = _build_dates(start_date, end_date)
    dates_all_str = [d.isoformat() for d in dates_all]
    dates_hist_str = [d.isoformat() for d in dates_hist]
    dates_campaign_str = [d.isoformat() for d in dates_campaign]
    variable_space = VariableSpace(
        workers=[_core_to_engine_worker(w, dates_campaign) for w in workers],
        all_days=dates_all_str,
        days_solving=dates_campaign_str,
        all_shifts=[shift.id for shift in shifts],
        shifts_not_deleted=[s.id for s in shifts if not s.deleted],
        shift_work=[
            s.id for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ],
        duty_recup_pairs=build_duty_recup_pairs(shifts),
    )
    coverage_engine = CoverageEngine(
        [ShiftDemandEngine(**sd.__dict__) for sd in shift_demand_dates]
    )
    requests_engine = _core_to_engine_requests(requests)
    constraints_engine = [_core_to_engine_constraint(c) for c in constraints]
    fixed_values_engine = core_to_engine_fixed_values(
        workers,
        dates_hist_str,
        dates_campaign_str,
        shifts,
        fixed_assignments,
        requests,
    )
    sol_hint_engine = core_to_engine_sol_hint(
        [w.id for w in workers if not w.deleted],
        dates_campaign,
        dates_campaign_str,
        variable_space.shifts_not_deleted,
        wip_assignments,
    )
    s_durations, s_start_times, s_end_times = _build_interval_parameters(
        shifts, dates_all
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage_engine,
        requests=requests_engine,
        constraints=constraints_engine,
        fixed_values=fixed_values_engine,
        sol_hint=sol_hint_engine,
        shift_durations=s_durations,
        shift_start_times=s_start_times,
        shift_end_times=s_end_times,
        fixed_config=FixedConfigEngine(
            max_weekly_hours_worked=_build_period_target_work_hours_week(
                80, dates_campaign
            ),
            max_duties_per_month=_build_period_target_duties_month(8, dates_campaign),
        ),
    )
    return inputs


def _core_to_engine_worker(worker: Worker, dates: List[date]) -> WorkerEngine:
    return WorkerEngine(
        id=worker.id,
        work_hours=_build_period_target_work_hours(worker.weekly_hours, dates),
        work_hours_desired=_build_period_target_work_hours(
            worker.weekly_hours_desired, dates
        ),
        duties_per_month=_build_period_target_duties_month(
            worker.duties_per_month, dates
        ),
        deleted=worker.deleted,
    )


def _build_period_target_work_hours(
    weekly_target_hours: int, dates: List[date]
) -> List[PeriodTargetEngine]:
    return _build_period_target_work_hours_week(weekly_target_hours, dates)


def _build_period_target_work_hours_week(
    weekly_target_hours: int, dates: List[date]
) -> List[PeriodTargetEngine]:
    weekly_target_minutes = weekly_target_hours * Constants.NUM_MINUTES_HOUR
    out: List[PeriodTargetEngine] = []
    dates = sorted(dates)  # Ensure dates are sorted

    while dates:
        # Get the start of the week (Monday)
        start_date = dates[0]
        start_of_week = start_date - timedelta(days=start_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # Get all dates in the current week
        week_dates = [d for d in dates if start_of_week <= d <= end_of_week]
        dates = [d for d in dates if d > end_of_week]

        # Calculate the adjusted target
        num_days_in_week = len(week_dates)
        adjusted_target = math.ceil(
            (weekly_target_minutes / Constants.NUM_DAYS_WEEK) * num_days_in_week
        )

        # Create PeriodTarget object
        period_target = PeriodTargetEngine(
            period=[d.isoformat() for d in week_dates],
            target=adjusted_target,
        )
        out.append(period_target)
    return out


def _build_period_target_duties_month(
    duties_per_month: int, dates: List[date]
) -> List[PeriodTargetEngine]:
    out: List[PeriodTargetEngine] = []
    dates = sorted(dates)  # Ensure dates are sorted

    while dates:
        # Get the start of the month
        start_date = dates[0]
        start_of_month = date(start_date.year, start_date.month, 1)
        _, last_day_month = calendar.monthrange(start_date.year, start_date.month)
        end_of_month = date(start_date.year, start_date.month, last_day_month)

        # Get all dates in the current month
        month_dates = [d for d in dates if start_of_month <= d <= end_of_month]
        dates = [d for d in dates if d > end_of_month]

        # Calculate the adjusted target
        num_days_in_month = len(month_dates)
        adjusted_target = math.ceil(
            (duties_per_month / end_of_month.day) * num_days_in_month
        )

        # Create PeriodTarget object
        period_target = PeriodTargetEngine(
            period=[d.isoformat() for d in month_dates],
            target=adjusted_target,
        )
        out.append(period_target)
    return out


def _core_to_engine_requests(requests: List[Request]) -> List[RequestEngine]:
    out = []
    for r in requests:
        for d in [
            r.start_date + timedelta(days=x)
            for x in range((r.end_date - r.start_date).days + 1)
        ]:
            out.append(
                RequestEngine(
                    id=r.id,
                    worker_id=r.worker_id,
                    date=d,
                    shift_id=r.shift_id,
                    hard=r.hard,
                    hard_to_soft=Constants.HARD_TO_SOFT and r.hard,
                    penalty=(
                        getattr(
                            penalty_map.request,
                            "hard",
                        )
                        if Constants.HARD_TO_SOFT and r.hard
                        else getattr(
                            penalty_map.request,
                            "medium",
                        )
                    ),
                )
            )
    return out


def core_to_engine_fixed_values(
    workers: List[Worker],
    days_not_solving: List[str],
    days_solving: List[str],
    shifts: List[Shift],
    assignments: List[Assignment],
    requests: List[Request],
) -> Dict[Tuple[str, str, str], int]:
    # Assignments before solving period
    out = {
        (w.id, d, s.id): 0 for w in workers for d in days_not_solving for s in shifts
    }
    for a in assignments:
        out[
            a.worker_id,
            a.date.isoformat(),
            a.shift_id,
        ] = 1
    # Assignments during solving period
    # Deleted workers and shifts
    for w in [w for w in workers if w.deleted]:
        for d in days_solving:
            for s in shifts:
                out[w.id, d, s.id] = 0
    for w in workers:
        for d in days_solving:
            for s in [s for s in shifts if s.deleted]:
                out[w.id, d, s.id] = 0
    # Leave shifts not requested:
    for w in [w for w in workers if not w.deleted]:
        for d in days_solving:
            for s in [s for s in shifts if s.leave_type != ShiftLeaveType.NONE]:
                d_date = date.fromisoformat(d)
                request = [
                    r
                    for r in requests
                    if r.worker_id == w.id
                    and r.shift_id == s.id
                    and r.start_date <= d_date <= r.end_date
                ]
                if not request:
                    out[w.id, d, s.id] = 0

    return out


def core_to_engine_sol_hint(
    workers_not_deleted: List[str],
    dates_campaign: List[date],
    dates_campaign_str: List[str],
    shifts_not_deleted: List[str],
    assignments: List[Assignment],
) -> Dict[Tuple[str, str, str], int]:
    out = {
        (w, d, s): 0
        for w in workers_not_deleted
        for d in dates_campaign_str
        for s in shifts_not_deleted
    }
    for a in assignments:
        a_in_domain = (
            a.worker_id in workers_not_deleted
            and a.date in dates_campaign
            and a.shift_id in shifts_not_deleted
        )
        if a_in_domain:
            out[
                a.worker_id,
                a.date.isoformat(),
                a.shift_id,
            ] = 1
    return out


def _core_to_engine_constraint(constraint: Constraint) -> ConstraintEngine:
    hard_to_soft = Constants.HARD_TO_SOFT
    return ConstraintEngine(
        id=constraint.id,
        constraint_type=constraint.constraint_type,
        operator=constraint.operator,
        target_value=constraint.target_value,
        target_unit=constraint.target_unit,
        worker_var=_core_to_engine_var_worker(constraint.worker_var),
        day_var=_core_to_engine_var_day(constraint.day_var),
        shift_var=_core_to_engine_var_shift(constraint.shift_var),
        hard=constraint.hard if not hard_to_soft else False,
        hard_to_soft=hard_to_soft and constraint.hard,
        penalty=(
            getattr(
                penalty_map.constraint,
                constraint.priority if constraint.priority != "" else "no",
            )
            if not hard_to_soft and constraint.hard
            else getattr(
                penalty_map.constraint,
                "hard",
            )
        ),
    )


def _core_to_engine_var_worker(var_worker: VarWorker) -> VarWorkerEngine:
    return VarWorkerEngine(
        selector=var_worker.selector,
        target=var_worker.target_ids,
        num_eligible_workers=var_worker.num_eligible_workers,
    )


def _core_to_engine_var_day(var_day: VarDay) -> VarDayEngine:
    return VarDayEngine(
        selector=var_day.selector,
        target=var_day.target,
        start_date=var_day.start_date,
        end_date=var_day.end_date,
        interval=var_day.interval,
    )


def _core_to_engine_var_shift(var_shift: VarShift) -> VarShiftEngine:
    return VarShiftEngine(
        selector=var_shift.selector,
        target=var_shift.target_ids,
        reference=var_shift.reference_ids,
        relative=var_shift.relative_ids,
    )


def _build_dates(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]


def _build_interval_parameters(
    shifts: List[Shift], dates=List[date]
) -> Tuple[Dict[str, int], Dict[Tuple[str, str], int], Dict[Tuple[str, str], int]]:
    s_durations = {}
    s_start_times = {}
    s_end_times = {}
    for s in shifts:
        s_durations[s.id] = int((s.end_time - s.start_time).total_seconds() // 60 - 1)
        day_diff = (s.end_time.date() - s.start_time.date()).days
        for d in dates:
            d_string = d.isoformat()
            s_start_times[d_string, s.id] = int(
                s.start_time.replace(year=d.year, month=d.month, day=d.day).timestamp()
                // Constants.NUM_SECONDS_MINUTE
            )
            s_end_times[d_string, s.id] = int(
                (
                    s.end_time.replace(year=d.year, month=d.month, day=d.day)
                    + timedelta(day_diff)
                ).timestamp()
                // Constants.NUM_SECONDS_MINUTE
                - 1
            )

    return s_durations, s_start_times, s_end_times


def build_duty_recup_pairs(shifts: List[Shift]) -> List[Tuple[str, str]]:
    out = []
    for shift in [s for s in shifts if not s.deleted]:
        if shift.shift_type == ShiftType.DUTY:
            # pylint: disable=R0801
            rec_shift = next(
                (
                    s
                    for s in shifts
                    if s.shift_type == ShiftType.REST
                    and s.rest_type == ShiftRestType.RECUPERATION
                    and s.recuperation_duty_id == shift.id
                    and not s.deleted
                ),
                None,
            )
            if rec_shift:
                out.append((shift.id, rec_shift.id))
    return out

    # shift_durations = {
    #     shift.id: int(
    #         (shift.end_time - shift.start_time).total_seconds() // 60 - 1
    #     )
    #     for shift in shifts
    # }
    # shift_start_times = {
    #     (
    #         d.strftime(Constants.ENGINE_STRING_DATE_FORMAT),
    #         s.id,
    #     ): int(
    #         s.start_time.replace(
    #             year=d.year, month=d.month, day=d.day
    #         ).timestamp()
    #         // Constants.NUM_SECONDS_MINUTE
    #     )
    #     for d in dates
    #     for s in shifts
    # }
    # shift_end_times = {
    #     (
    #         d.strftime(Constants.ENGINE_STRING_DATE_FORMAT),
    #         s.id,
    #     ): int(
    #         s.end_time.replace(
    #             year=d.year, month=d.month, day=d.day
    #         ).timestamp()
    #         // Constants.NUM_SECONDS_MINUTE
    #         - 1
    #     )
    #     for d in dates
    #     for s in shifts
    # }
    # return shift_durations, shift_start_times, shift_end_times


# if s.id == "66e88a44b774f3030fb038e3":
#     if d in [date(2024, 10, 26), date(2024, 10, 27)]:
#         start_time_dt = datetime.fromtimestamp(
#             s_start_times[d_string, s.id] * Constants.NUM_SECONDS_MINUTE
#         )
#         end_time_dt = datetime.fromtimestamp(
#             s_end_times[d_string, s.id] * Constants.NUM_SECONDS_MINUTE
#         )
#         print("id           ", s.id)
#         print("name         ", s.name)
#         print("date         ", d_string)
#         print("start        ", s_start_times[d_string, s.id])
#         print("end          ", s_end_times[d_string, s.id])
#         print("start_dt     ", start_time_dt)
#         print("end_dt       ", end_time_dt)
#         print("duration     ", s_durations[s.id])
#         print(
#             "duration calc",
#             (s_end_times[d_string, s.id] - s_start_times[d_string, s.id]),
#         )
