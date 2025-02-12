import math
from datetime import date, timedelta
from typing import Dict, List

from shared.schemas import DailyShiftDemand, Request, Shift, ShiftType, Worker

from utils.constants import Constants


# pylint: disable=too-many-locals
def calculate_worker_work_times(
    workers: List[Worker],
    shift_demands: List[DailyShiftDemand],
    shifts: List[Shift],
    requests: List[Request],
    periods: List[List[date]],
) -> Dict[str, Dict[str, List[int]]]:
    worker_work_times: Dict[str, Dict[str, List[int]]] = {}

    shift_leave_ids = [
        shift.id for shift in shifts if shift.shift_type == ShiftType.LEAVE
    ]

    target_work_times = calculate_proportional_times(
        workers, shifts, shift_demands, periods
    )

    for worker in workers:
        # Weekly times in minutes
        worker_work_times[worker.id] = {
            "contract": [],
            "desired": [],
            "max": [],
            "target": [],
        }

        requests_leave = [
            r
            for r in requests
            if r.shift_id in shift_leave_ids and r.worker_id == worker.id
        ]
        for period_index, period in enumerate(periods):
            num_days_in_period = len(period)
            if num_days_in_period == 0:
                continue

            # Calculate the number of holiday days in the period
            time_off_days = calculate_time_off_days(
                requests_leave, period, shifts
            )

            # Calculate the adjustment coefficient
            coefficient = calculate_adjustment_coefficient(
                num_days_in_period, time_off_days, Constants.NUM_DAYS_WEEK
            )

            # Adjust the work time for holidays
            adjusted_contract_time = math.ceil(
                worker.weekly_hours * Constants.NUM_MINUTES_HOUR * coefficient
            )
            adjusted_desired_time = math.ceil(
                worker.weekly_hours_desired
                * Constants.NUM_MINUTES_HOUR
                * coefficient
            )
            adjusted_max_time = math.ceil(
                1000 * Constants.NUM_MINUTES_HOUR * coefficient
            )

            worker_work_times[worker.id]["contract"].append(
                adjusted_contract_time
            )
            worker_work_times[worker.id]["desired"].append(
                adjusted_desired_time
            )
            worker_work_times[worker.id]["max"].append(adjusted_max_time)
            worker_work_times[worker.id]["target"].append(
                target_work_times[worker.id][period_index]
            )

    return worker_work_times


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
    daily_shift_demands: List[DailyShiftDemand], shifts: List[Shift]
) -> int:
    total_work_time = 0.0

    # Create a dictionary to quickly access shift details by shift_id
    shift_dict = {shift.id: shift for shift in shifts}

    for dsd in daily_shift_demands:
        shift = shift_dict.get(dsd.shift_id, None)
        if shift is None:
            continue
        if shift and shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]:
            shift_duration = (
                shift.end_time - shift.start_time
            ).total_seconds() / 60
            total_work_time += shift_duration * dsd.count

    return int(total_work_time)


def calculate_adjustment_coefficient(
    period_length: int, time_off_days: float, ref_period_length: int
) -> float:
    return max(0, min(1, (period_length - time_off_days) / ref_period_length))


def calculate_proportional_times(
    workers: List[Worker],
    shifts: List[Shift],
    shift_demands: List[DailyShiftDemand],
    periods: List[List[date]],
) -> Dict[str, List[int]]:

    period_work_times = {}
    for period_index, period in enumerate(periods):
        period_shift_demands = [
            dsd for dsd in shift_demands if dsd.date in period
        ]
        period_work_times[period_index] = calculate_total_work_time_minutes(
            period_shift_demands, shifts
        )

    total_desired_time = sum(worker.weekly_hours_desired for worker in workers)

    proportional_times: Dict[str, List[float]] = {}
    for worker in workers:
        for i, period in enumerate(periods):
            period_work_time = period_work_times[i]
            if total_desired_time > 0:
                proportional_time = (
                    worker.weekly_hours_desired / total_desired_time
                ) * period_work_time
            else:
                proportional_time = 0.0
            if worker.id not in proportional_times:
                proportional_times[worker.id] = []
            proportional_times[worker.id].append(proportional_time)

    return round_proportional_times(proportional_times, period_work_times)


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
    period_work_times: Dict[int, int],
) -> Dict[str, List[int]]:
    rounded_times: Dict[str, List[int]] = {
        worker_id: [] for worker_id in proportional_times.keys()
    }

    for period_index, total_work_time in period_work_times.items():
        # Calculate the initial rounded times and the rounding error
        period_rounded_times: Dict[str, int] = {
            worker_id: round(proportional_times[worker_id][period_index])
            for worker_id in proportional_times.keys()
        }
        total_rounded_time = sum(period_rounded_times.values())
        rounding_error = total_work_time - total_rounded_time

        # Distribute the rounding error across the workers
        sorted_workers = sort_workers(
            period_index, proportional_times, period_rounded_times
        )

        for i in range(abs(rounding_error)):
            worker_id = sorted_workers[i % len(sorted_workers)]
            if rounding_error > 0:
                period_rounded_times[worker_id] += 1
            elif rounding_error < 0:
                period_rounded_times[worker_id] -= 1

        # Store the rounded times for the current period
        for worker_id, rounded_time in period_rounded_times.items():
            rounded_times[worker_id].append(rounded_time)

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
