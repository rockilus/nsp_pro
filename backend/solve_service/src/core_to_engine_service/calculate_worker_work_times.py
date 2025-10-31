import math
from datetime import date, timedelta
from typing import Dict, List, Tuple

from shared.schemas.core import (
    Request,
    Schedule,
    Shift,
    ShiftDemandNew,
    ShiftType,
    Worker,
    WorkerDates,
)

from engine import GroupsAssignmentsDurationsTargetConstraint
from utils.constants import Constants


# pylint: disable=too-many-arguments
def build_work_time_constraints(
    periods: List[List[date]],
    w_to_work_times: Dict[str, Dict[str, List[int]]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    penalty: int,
    tolerance: float,
) -> List[GroupsAssignmentsDurationsTargetConstraint]:
    #     len(periods)
    # List[GroupsAssignmentsDurationsTargetConstraint]=
    #         len(workers) x len(shifts work) * len(period)
    #     assignments: List[List[Tuple[str, str, str]]]
    #         len(workers) x len(shifts work) * len(period)
    #     durations: List[List[Tuple[str, str, str]]]
    #         len(workers)
    #     targets: List[int]
    #     penalty: int
    #     tolerance: int
    p_index_to_period: Dict[int, List[date]] = dict(enumerate(periods))

    p_index_to_gadtc: Dict[int, GroupsAssignmentsDurationsTargetConstraint] = {}
    for w_id, work_times in w_to_work_times.items():
        target_work_times = work_times["target"]
        for i, period in p_index_to_period.items():
            if len(period) == 0:
                continue
            if i not in p_index_to_gadtc:
                p_index_to_gadtc[i] = GroupsAssignmentsDurationsTargetConstraint(
                    assignments=[
                        [
                            (w_id, d.isoformat(), s.id)
                            for d in period
                            for s in shifts_work
                            if d
                            in ws_to_dates[(w_id, s.id)].dates_hist
                            + ws_to_dates[(w_id, s.id)].dates_campaign
                            and d in period
                        ]
                    ],
                    durations=[
                        [
                            shift_id_to_duration_dict[s.id]
                            for d in period
                            for s in shifts_work
                            if d
                            in ws_to_dates[(w_id, s.id)].dates_hist
                            + ws_to_dates[(w_id, s.id)].dates_campaign
                            and d in period
                        ]
                    ],
                    targets=[target_work_times[i]],
                    penalty=penalty,
                    tolerance=tolerance,
                )
            else:
                p_index_to_gadtc[i].assignments.append(
                    [
                        (w_id, d.isoformat(), s.id)
                        for d in period
                        for s in shifts_work
                        if d
                        in ws_to_dates[(w_id, s.id)].dates_hist
                        + ws_to_dates[(w_id, s.id)].dates_campaign
                        and d in period
                    ]
                )
                p_index_to_gadtc[i].durations.append(
                    [
                        shift_id_to_duration_dict[s.id]
                        for d in period
                        for s in shifts_work
                        if d
                        in ws_to_dates[(w_id, s.id)].dates_hist
                        + ws_to_dates[(w_id, s.id)].dates_campaign
                        and d in period
                    ]
                )
                p_index_to_gadtc[i].targets.append(target_work_times[i])
    return list(p_index_to_gadtc.values())


# pylint: disable=too-many-locals, too-many-arguments
def calculate_worker_work_times(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    requests: List[Request],
    shift_demands: List[ShiftDemandNew],
    periods: List[List[date]],
) -> Dict[str, Dict[str, List[int]]]:
    # [
    # key: worker_id,
    # value: {
    #   key: [contract, desired, max, target],
    #   value: [target time in minute for each period]}
    # ]
    worker_work_times: Dict[str, Dict[str, List[int]]] = {}

    shift_leave_ids = [
        shift.id for shift in shifts if shift.shift_type == ShiftType.LEAVE
    ]
    requests_leave = [r for r in requests if r.shift_id in shift_leave_ids]

    w_id_to_coef = calculate_adjustment_coefficients(
        schedule,
        workers,
        shifts,
        requests_leave,
        periods,
        [Constants.NUM_DAYS_WEEK for _ in periods],
    )

    target_work_times = calculate_proportional_times(
        workers, shifts, shift_demands, periods, w_id_to_coef
    )

    for worker in workers:
        # Weekly times in minutes
        worker_work_times[worker.id] = {
            "contract": [],
            "desired": [],
            "max": [],
            "target": [],
        }
        for period_index, period in enumerate(periods):
            num_days_in_period = len(period)
            if num_days_in_period == 0:
                continue

            coefficient = w_id_to_coef[worker.id][period_index]

            # Adjust the work time for holidays
            adjusted_contract_time = math.ceil(
                worker.weekly_hours * Constants.NUM_MINUTES_HOUR * coefficient
            )
            adjusted_desired_time = math.ceil(
                worker.weekly_hours_desired * Constants.NUM_MINUTES_HOUR * coefficient
            )
            adjusted_max_time = math.ceil(
                200 * Constants.NUM_MINUTES_HOUR * coefficient
            )

            worker_work_times[worker.id]["contract"].append(adjusted_contract_time)
            worker_work_times[worker.id]["desired"].append(adjusted_desired_time)
            worker_work_times[worker.id]["max"].append(adjusted_max_time)
            worker_work_times[worker.id]["target"].append(
                target_work_times[worker.id][period_index]
            )

    return worker_work_times


def calculate_adjustment_coefficients(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    requests_leave: List[Request],
    periods: List[List[date]],
    ref_period_lengths: List[int],
) -> Dict[str, List[float]]:
    w_id_to_coef: Dict[str, List[float]] = {}

    workers_empl_dates = build_employment_dates_dict(workers, schedule)
    for worker in workers:
        for i, period in enumerate(periods):
            worker_period = [d for d in period if d in workers_empl_dates[worker.id]]

            # Calculate the number of time off days in the period
            rls_worker = [r for r in requests_leave if r.worker_id == worker.id]
            time_off_days = calculate_time_off_days(rls_worker, worker_period, shifts)

            # Adjust the period length for time off days
            adjusted_length = max(0, len(worker_period) - time_off_days)
            if worker.id not in w_id_to_coef:
                w_id_to_coef[worker.id] = []
            if ref_period_lengths[i] == 0:
                w_id_to_coef[worker.id].append(0)
            else:
                w_id_to_coef[worker.id].append(
                    max(0, min(1, adjusted_length / ref_period_lengths[i]))
                )

    return w_id_to_coef


def build_employment_dates_dict(
    workers: List[Worker], schedule: Schedule
) -> Dict[str, List[date]]:
    employment_dates_dict: Dict[str, List[date]] = {}

    for worker in workers:
        start_date = worker.employment_start_date
        end_date = worker.employment_end_date or schedule.end_date
        employment_dates = [
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
        ]
        employment_dates_dict[worker.id] = employment_dates

    return employment_dates_dict


# pylint: disable=too-many-nested-blocks
def calculate_time_off_days(
    requests_leave: List[Request], period: List[date], shifts: List[Shift]
) -> float:
    time_off_days = 0.0

    for request in requests_leave:
        request_start = max(request.start_date, period[0])
        request_end = min(request.end_date, period[-1])
        request_days = (request_end - request_start).days + 1

        for shift in shifts:
            if shift.id == request.shift_id:
                shift_duration = (
                    shift.end_time - shift.start_time
                ).total_seconds() / 60

                for day in range(request_days):
                    current_date = request_start + timedelta(days=day)
                    if current_date in period:
                        if shift_duration >= 24 * 60:
                            time_off_days += 1
                        else:
                            time_off_days += 0.5

    return time_off_days


def calculate_total_work_time_minutes(
    daily_shift_demands: List[ShiftDemandNew], shifts: List[Shift]
) -> int:
    total_work_time = 0.0

    # Create a dictionary to quickly access shift details by shift_id
    shift_dict = {shift.id: shift for shift in shifts}

    for dsd in daily_shift_demands:
        shift = shift_dict.get(dsd.shift_id, None)
        if shift is None:
            continue
        if shift and shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]:
            shift_duration = max(
                int(
                    (shift.end_time - shift.start_time).total_seconds()
                    / Constants.NUM_SECONDS_MINUTE
                    - 1
                ),
                0,
            )
            total_work_time += shift_duration * dsd.count

    return int(total_work_time)


def calculate_proportional_times(
    workers: List[Worker],
    shifts: List[Shift],
    shift_demands: List[ShiftDemandNew],
    periods: List[List[date]],
    w_id_to_coef: Dict[str, List[float]],
) -> Dict[str, List[int]]:

    period_index_to_required_work_time = {}
    for period_index, period in enumerate(periods):
        period_shift_demands = [dsd for dsd in shift_demands if dsd.date in period]
        period_index_to_required_work_time[period_index] = (
            calculate_total_work_time_minutes(period_shift_demands, shifts)
        )

    total_week_desired_work_time: List[float] = [
        sum(
            worker.weekly_hours_desired * w_id_to_coef[worker.id][i]
            for worker in workers
        )
        for i in range(len(periods))
    ]

    w_id_to_target_work_time_by_period: Dict[str, List[float]] = {}
    for worker in workers:
        for i, period in enumerate(periods):
            period_work_time = period_index_to_required_work_time[i]
            period_total_desired_work_time = total_week_desired_work_time[i]
            if period_total_desired_work_time > 0:
                target_work_time = (
                    worker.weekly_hours_desired
                    * w_id_to_coef[worker.id][i]
                    / period_total_desired_work_time
                ) * period_work_time
            else:
                target_work_time = 0.0
            if worker.id not in w_id_to_target_work_time_by_period:
                w_id_to_target_work_time_by_period[worker.id] = []
            w_id_to_target_work_time_by_period[worker.id].append(target_work_time)

    return round_proportional_times(w_id_to_target_work_time_by_period)


def sort_workers(
    period_index: int,
    proportional_times: Dict[str, List[float]],
    period_rounded_times: Dict[str, int],
) -> List[str]:
    return sorted(
        proportional_times.keys(),
        key=lambda worker_id: proportional_times[worker_id][period_index]
        - period_rounded_times[worker_id],
        reverse=True,
    )


def round_proportional_times(
    proportional_times: Dict[str, List[float]],
) -> Dict[str, List[int]]:
    """Round proportional (float) times to non-negative ints while preserving
    the total per period.

        Uses the largest-remainder (Hamilton) method per period:
            - take floor of each worker's value
                    - compute how many units are still needed to reach the
                        rounded total
            - distribute the remaining units to workers with largest
                fractional remainders

    This avoids repeated per-unit loops and handles large numbers efficiently.
    """
    rounded_times: Dict[str, List[int]] = {w: [] for w in proportional_times.keys()}

    # Nothing to do
    if not proportional_times:
        return rounded_times

    # Number of periods is the length of the first worker's list
    len_first_value = len(next(iter(proportional_times.values())))
    worker_ids = list(proportional_times.keys())

    for i in range(len_first_value):
        # clamp negative values to 0.0 defensively
        vals: Dict[str, float] = {
            w: max(0.0, float(proportional_times[w][i])) for w in worker_ids
        }

        total = sum(vals.values())
        total_needed = int(round(total))
        total_needed = max(total_needed, 0)

        # Base allocation: floors
        floors: Dict[str, int] = {w: int(math.floor(vals[w])) for w in worker_ids}
        base_total = sum(floors.values())

        # Fractional remainders used to distribute extra units
        remainders: Dict[str, float] = {w: vals[w] - floors[w] for w in worker_ids}

        if total_needed >= base_total:
            # Need to add (total_needed - base_total) units
            add = total_needed - base_total
            if add > 0:
                # Sort by remainder desc, then by value desc to break ties
                ordered = sorted(
                    worker_ids,
                    key=lambda w, rem=remainders, v=vals: (  # type: ignore
                        rem[w],
                        v[w],
                    ),
                    reverse=True,
                )
                n = len(ordered)
                # Distribute in round-robin across ordered list to
                # handle add > n
                for k in range(add):
                    floors[ordered[k % n]] += 1
        else:
            # Need to remove (base_total - total_needed) units
            remove = base_total - total_needed
            if remove > 0:
                # Prefer to remove from workers with smallest remainder
                # (closest to an exact integer). Tie-break on smaller value
                # so we remove from those contributing less overall.
                ordered = sorted(
                    worker_ids,
                    key=lambda w, rem=remainders, v=vals: (  # type: ignore
                        rem[w],
                        v[w],
                    ),
                )
                for w in ordered:
                    if remove <= 0:
                        break
                    can_remove = min(floors[w], remove)
                    floors[w] -= can_remove
                    remove -= can_remove

        # Final safeguard: ensure non-negative and append
        for w in worker_ids:
            rounded_times[w].append(max(0, floors[w]))

    return rounded_times


# def calculate_time_off_minutes(
#     requests_leave: List[Request], period: List[date], shifts: List[Shift]
# ) -> int:
#     time_off_minutes = 0

#     for request in requests_leave:
#         request_start = max(request.start_date, period[0])
#         request_end = min(request.end_date, period[-1])
#         request_days = (request_end - request_start).days + 1

#         for shift in shifts:
#             if shift.id == request.shift_id:
#                 shift_duration = (
#                     shift.end_time - shift.start_time
#                 ).total_seconds() / 60

#                 for day in range(request_days):
#                     current_date = request_start + timedelta(days=day)
#                     if current_date in period:
#                         time_off_minutes += shift_duration

#     return time_off_minutes
