import calendar
import math
from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import (
    Assignment,
    Attribute,
    Constraints,
    Dimension,
    Request,
    Shift,
    ShiftDemandDate,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Worker,
)
from core_to_engine_service.build_engine_variables import build_engine_variables
from core_to_engine_service.build_engine_work_loads import build_engine_work_loads
from core_to_engine_service.build_worker_shift_filter import build_worker_shift_filters
from core_to_engine_service.penalty_map import penalty_map
from engine import ConstraintFai as ConstraintFaiEngine
from engine import ConstraintFil as ConstraintFilEngine
from engine import ConstraintOrd as ConstraintOrdEngine
from engine import Constraints as ConstraintsEngine
from engine import ConstraintSeq as ConstraintSeqEngine
from engine import ConstraintSum as ConstraintSumEngine
from engine import Coverage as CoverageEngine
from engine import FixedConfig as FixedConfigEngine
from engine import Inputs
from engine import PeriodTarget as PeriodTargetEngine
from engine import Request as RequestEngine
from engine import Shift as ShiftEngine
from engine import ShiftDemand as ShiftDemandEngine
from engine import Staffing as StaffingEngine
from engine import VariableSpace
from engine import Worker as WorkerEngine
from utils.constants import Constants


# pylint: disable=too-many-arguments, too-many-locals
def core_to_engine_inputs(
    workers: List[Worker],
    dates_all: List[date],
    dates_hist: List[date],
    dates_campaign: List[date],
    shifts: List[Shift],
    dimensions: List[Dimension],
    attributes: List[Attribute],
    shift_demand_dates: List[ShiftDemandDate],
    requests: List[Request],
    constraints: Constraints,
    fixed_assignments: List[Assignment],
    wip_assignments: List[Assignment],
) -> Inputs:
    dates_all_str = [d.isoformat() for d in dates_all]
    dates_hist_str = [d.isoformat() for d in dates_hist]
    dates_campaign_str = [d.isoformat() for d in dates_campaign]
    variable_space = VariableSpace(
        workers=[_core_to_engine_worker(w, dates_campaign) for w in workers],
        all_days=dates_all_str,
        days_solving=dates_campaign_str,
        shifts=[_core_to_engine_shift(s) for s in shifts],
        duty_recup_pairs=build_duty_recup_pairs(shifts),
    )
    coverage_engine = CoverageEngine(
        [ShiftDemandEngine(**sd.__dict__) for sd in shift_demand_dates]
    )
    requests_engine = _core_to_engine_requests(requests)
    constraints_engine = _core_to_engine_constraints(constraints)
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
        [s.id for s in shifts if not s.deleted],
        wip_assignments,
    )
    shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

    inputs = Inputs(
        variables=build_engine_variables(workers, dates_all, shifts),
        no_overlap_shift_intervals=[
            [(w.id, d.isoformat(), s.id) for d in dates_all for s in shifts]
            for w in workers
        ],
        work_loads=build_engine_work_loads(
            workers, dates_campaign, shifts, shift_id_to_duration_dict
        ),
        variable_space=variable_space,
        coverage=coverage_engine,
        requests=requests_engine,
        constraints=constraints_engine,
        worker_shift_filters=build_worker_shift_filters(
            workers, dates_campaign, shifts, dimensions, attributes
        ),
        fixed_values=fixed_values_engine,
        sol_hint=sol_hint_engine,
        shift_durations=shift_id_to_duration_dict,
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
        specialty_ids=worker.specialty_ids,
        deleted=worker.deleted,
    )


def _core_to_engine_shift(shift: Shift) -> ShiftEngine:
    return ShiftEngine(
        id=shift.id,
        staffing=[StaffingEngine(**s.__dict__) for s in shift.staffing],
        work_shift=shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY],
        deleted=shift.deleted,
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


def _core_to_engine_constraints(constraints: Constraints) -> ConstraintsEngine:
    return ConstraintsEngine(
        sum=[ConstraintSumEngine(**c_sum.__dict__) for c_sum in constraints.sum],
        seq=[ConstraintSeqEngine(**c_seq.__dict__) for c_seq in constraints.seq],
        ord=[ConstraintOrdEngine(**c_ord.__dict__) for c_ord in constraints.ord],
        fil=[ConstraintFilEngine(**c_fil.__dict__) for c_fil in constraints.fil],
        fai=[ConstraintFaiEngine(**c_fai.__dict__) for c_fai in constraints.fai],
    )


def _build_shift_id_to_duration_dict(shifts: List[Shift]) -> Dict[str, int]:
    return {
        s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1) for s in shifts
    }


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
