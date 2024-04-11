from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple

from core import (
    Assignment,
    Constraint,
    Request,
    Shift,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
    Worker,
)
from engine import Constraint as ConstraintEngine
from engine import Coverage as CoverageEngine
from engine import Inputs
from engine import Request as RequestEngine
from engine import ShiftDemand as ShiftDemandEngine
from engine import VarDay as VarDayEngine
from engine import VariableSpace
from engine import VarShift as VarShiftEngine
from engine import VarWorker as VarWorkerEngine
from services.schedule_services.penalty_map import penalty_map
from utils.constants import Constants


# pylint: disable=too-many-arguments, too-many-locals
def core_to_engine_inputs(
    workers: List[Worker],
    start_date: date,
    end_date: date,
    shifts: List[Shift],
    shift_demands: List[List[ShiftDemand] | None],
    requests: List[Request],
    constraints: List[Constraint],
    prev_assignments: List[Assignment],
    wip_assignments: List[Assignment],
) -> Inputs:
    r_engine = _core_to_engine_requests(requests)
    start_date_hist = (
        min(a.date for a in prev_assignments) if prev_assignments else start_date
    )
    end_date_hist = start_date - timedelta(days=1)
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        days=_build_day_coordinates(start_date_hist, end_date),
        shifts=[shift.id for shift in shifts],
    )
    dates = _build_dates(start_date_hist, end_date)
    s_durations, s_start_times, s_end_times = _build_interval_parameters(shifts, dates)
    inputs = Inputs(
        variable_space=variable_space,
        coverage=CoverageEngine(
            _build_shift_demands(shift_demands, shifts, start_date, end_date)
        ),
        requests=r_engine,
        constraints=[_core_to_engine_constraint(c) for c in constraints],
        fixed_values=core_to_engine_sol_hint(
            variable_space.workers,
            _build_day_coordinates(start_date_hist, end_date_hist),
            variable_space.shifts,
            prev_assignments,
        ),
        sol_hint=core_to_engine_sol_hint(
            variable_space.workers,
            _build_day_coordinates(start_date, end_date),
            variable_space.shifts,
            wip_assignments,
        ),
        shift_durations=s_durations,
        shift_start_times=s_start_times,
        shift_end_times=s_end_times,
    )
    return inputs


def _build_shift_demands(
    shift_demands: List[List[ShiftDemand] | None],
    shifts: List[Shift],
    start_date: date,
    end_date: date,
) -> List[ShiftDemandEngine]:
    sd_engine = []
    shifts_not_off = [s for s in shifts if not s.is_time_off]
    shift_demands_flat = [
        sd for sds_list in shift_demands if sds_list is not None for sd in sds_list
    ]
    for s in shifts_not_off:
        for day in range((end_date - start_date).days + 1):
            cov_date = start_date + timedelta(days=day)
            sds = [
                sd
                for sd in shift_demands_flat
                if sd.day_index == cov_date.weekday() and sd.shift_id == s.id
            ]
            if sds:
                sd_engine.append(
                    ShiftDemandEngine(
                        date=cov_date,
                        shift_id=s.id,
                        staffing=s.staffing * len(sds),
                    )
                )
            else:
                sd_engine.append(
                    ShiftDemandEngine(
                        date=cov_date,
                        shift_id=s.id,
                        staffing=0,
                    )
                )
    return sd_engine


def _core_to_engine_requests(requests: List[Request]) -> List[RequestEngine]:
    out = []
    for r in requests:
        out.append(
            RequestEngine(
                id=r.id,
                worker_id=r.worker_id,
                date=r.date,
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


def core_to_engine_sol_hint(
    workers: List[str],
    days: List[str],
    shifts: List[str],
    assignments: List[Assignment],
) -> Dict[Tuple[str, str, str], int]:
    return {
        (w, d, s): (
            1
            if any(
                a.worker_id == w
                and a.date
                == datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                and a.shift_id == s
                for a in assignments
            )
            else 0
        )
        for w in workers
        for d in days
        for s in shifts
    }


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


def _build_day_coordinates(start_date: date, end_date: date) -> List[str]:
    delta = end_date - start_date
    dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
    return [date.strftime(Constants.ENGINE_STRING_DATE_FORMAT) for date in dates]


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
            d_string = d.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
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
