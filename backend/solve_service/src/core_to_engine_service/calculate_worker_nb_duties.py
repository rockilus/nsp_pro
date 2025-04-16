import calendar
import math
from datetime import date
from typing import Dict, List, Tuple

from shared.schemas.core import (
    DailyShiftDemand,
    Request,
    Schedule,
    Shift,
    ShiftType,
    Worker,
    WorkerDates,
)

from core_to_engine_service.calculate_worker_work_times import (
    calculate_adjustment_coefficients,
    round_proportional_times,
)
from engine import GroupsAssignmentsTargetConstraint


# pylint: disable=too-many-arguments, R0801
def build_nb_duties_constraints(
    periods: List[List[date]],
    w_to_nb_duties: Dict[str, Dict[str, List[int]]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_duty: List[Shift],
    penalty: int,
    tolerance: float,
) -> List[GroupsAssignmentsTargetConstraint]:
    #     len(periods)
    # List[GroupsAssignmentsTargetConstraint]=
    #         len(workers) x len(shifts duty) * len(period)
    #     assignments: List[List[Tuple[str, str, str]]]
    #         len(workers)
    #     targets: List[int]
    #     penalty: int
    #     tolerance: int
    p_index_to_period: Dict[int, List[date]] = dict(enumerate(periods))

    p_index_to_gadtc: Dict[int, GroupsAssignmentsTargetConstraint] = {}
    for w_id, nb_duties in w_to_nb_duties.items():
        target_work_times = nb_duties["target"]
        for i, period in p_index_to_period.items():
            if len(period) == 0:
                continue
            if i not in p_index_to_gadtc:
                p_index_to_gadtc[i] = GroupsAssignmentsTargetConstraint(
                    assignments=[
                        [
                            (w_id, d.isoformat(), s.id)
                            for d in period
                            for s in shifts_duty
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
                        for s in shifts_duty
                        if d
                        in ws_to_dates[(w_id, s.id)].dates_hist
                        + ws_to_dates[(w_id, s.id)].dates_campaign
                        and d in period
                    ]
                )
                p_index_to_gadtc[i].targets.append(target_work_times[i])
    return list(p_index_to_gadtc.values())


# pylint: disable=too-many-locals, too-many-arguments, R0801
def calculate_worker_nb_duties(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    requests: List[Request],
    shift_demands: List[DailyShiftDemand],
    periods: List[List[date]],
) -> Dict[str, Dict[str, List[int]]]:
    # [
    # key: worker_id,
    # value: {
    #   key: [desired, max, target],
    #   value: [target nb of duties for each period]}
    # ]
    worker_nb_duties: Dict[str, Dict[str, List[int]]] = {}

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
        get_nb_days_in_months(periods),
    )

    target_work_times = calculate_proportional_nb_duties(
        workers, shifts, shift_demands, periods, w_id_to_coef
    )

    for worker in workers:
        # Weekly times in minutes
        worker_nb_duties[worker.id] = {
            "desired": [],
            "max": [],
            "target": [],
        }
        for period_index, period in enumerate(periods):
            num_days_in_period = len(period)
            if num_days_in_period == 0:
                continue

            coefficient = w_id_to_coef[worker.id][period_index]

            adjusted_desired_nb_duties = math.ceil(
                worker.duties_per_month * coefficient
            )
            adjusted_max_nb_duties = math.ceil(80 * coefficient)

            worker_nb_duties[worker.id]["desired"].append(adjusted_desired_nb_duties)
            worker_nb_duties[worker.id]["max"].append(adjusted_max_nb_duties)
            worker_nb_duties[worker.id]["target"].append(
                target_work_times[worker.id][period_index]
            )

    return worker_nb_duties


def calculate_proportional_nb_duties(
    workers: List[Worker],
    shifts: List[Shift],
    shift_demands: List[DailyShiftDemand],
    periods: List[List[date]],
    w_id_to_coef: Dict[str, List[float]],
) -> Dict[str, List[int]]:

    period_index_to_required_nb_duties = {}
    for period_index, period in enumerate(periods):
        shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]
        period_dsds_duty = [
            dsd
            for dsd in shift_demands
            if dsd.date in period and dsd.shift_id in shift_duty_ids
        ]
        period_index_to_required_nb_duties[period_index] = sum(
            dsd.count for dsd in period_dsds_duty
        )
    total_period_desired_nb_duties: List[float] = [
        sum(worker.duties_per_month * w_id_to_coef[worker.id][i] for worker in workers)
        for i in range(len(periods))
    ]

    w_id_to_target_nb_duties_by_period: Dict[str, List[float]] = {}
    for worker in workers:
        for i, period in enumerate(periods):
            period_nb_duties = period_index_to_required_nb_duties[i]
            period_total_desired_nb_duties = total_period_desired_nb_duties[i]
            if period_total_desired_nb_duties > 0:
                target_nb_duties = (
                    worker.duties_per_month
                    * w_id_to_coef[worker.id][i]
                    / period_total_desired_nb_duties
                ) * period_nb_duties
            else:
                target_nb_duties = 0.0
            if worker.id not in w_id_to_target_nb_duties_by_period:
                w_id_to_target_nb_duties_by_period[worker.id] = []
            w_id_to_target_nb_duties_by_period[worker.id].append(target_nb_duties)

    return round_proportional_times(w_id_to_target_nb_duties_by_period)


def get_nb_days_in_months(dates_list: List[List[date]]) -> List[int]:
    days_in_months = []
    for dates in dates_list:
        if dates:
            year = dates[0].year
            month = dates[0].month
            days_in_month = calendar.monthrange(year, month)[1]
            days_in_months.append(days_in_month)
        else:
            days_in_months.append(0)
    return days_in_months
