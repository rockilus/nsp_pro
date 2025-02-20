from datetime import date, timedelta
from typing import Dict, List

from shared.schemas import (
    Assignment,
    DailyShiftDemand,
    Request,
    Shift,
    ShiftType,
    Worker,
    WorkerDates,
)

from core_to_engine_service.calculate_worker_work_times import round_proportional_times
from core_to_engine_service.penalties import penalties
from engine import AssignmentsTargetConstraint

# Count the number of duties on special days in the past (LTM including campaign)
# Count the required number of duties on special days in the future
# Count the number of day off on special days for each worker
# Calculate target number of duties for each worker on LTM


# pylint: disable=too-many-arguments
def build_duty_special_days_constraints(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    dates_hist: List[date],
    dates_campaign: List[date],
    shifts: List[Shift],
    requests: List[Request],
    daily_shift_demands: List[DailyShiftDemand],
    fixed_assignments: List[Assignment],
) -> List[AssignmentsTargetConstraint]:
    w_to_special_days = calculate_worker_speacial_days(
        workers,
        worker_ids_to_worker_dates,
        dates_hist,
        dates_campaign,
        shifts,
        requests,
        daily_shift_demands,
        fixed_assignments,
    )
    shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]
    return [
        AssignmentsTargetConstraint(
            assignments=[
                (w_id, d, s) for d in special_day_dict["dates"] for s in shift_duty_ids
            ],
            target=special_day_dict["target"],  # type: ignore
            penalty=penalties.system_constraint.special_days_target_nb_duties,
        )
        for w_id, special_day_dict in w_to_special_days.items()
    ]


# pylint: disable=too-many-arguments
def calculate_worker_speacial_days(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    dates_hist: List[date],
    dates_campaign: List[date],
    shifts: List[Shift],
    requests: List[Request],
    daily_shift_demands: List[DailyShiftDemand],
    fixed_assignments: List[Assignment],
) -> Dict[str, Dict[str, Dict[str, int | List[date]]]]:
    # [
    # key: worker_id,
    # value: {
    #   key: [3, 4, 5, 6],
    #   value: {
    #     key: [target, dates],
    #     value: target nb of duties, [dates]
    #   }
    # }
    # ]

    # build a list of dates that is the smallest of (i) dates_hist +
    # dates_campaign and (ii) the last 12 months from the last date in
    # dates_campaign
    dates_ltm = get_ltm_dates(dates_hist, dates_campaign)

    # build a dictionary with key special day label, and value the list of
    # corresponding dates in the last 12 months
    special_day_indexes = [3, 4, 5, 6]
    special_day_dates = {
        str(i): [d for d in dates_ltm if d.weekday() == i] for i in special_day_indexes
    }

    # build a dictionary with key special day label, and value the sum of (i)
    # the count of duties on this special days in the past (LTM excluding
    # campaign) and (ii) the required number of duties on special days in the
    # future (campaign)
    shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]
    special_day_nb_duties = {
        str(i): sum(
            1
            for a in fixed_assignments
            if a.shift_id in shift_duty_ids
            and a.date in special_day_dates[str(i)]
            and a.date in dates_hist
        )
        + sum(
            dsd.count
            for dsd in daily_shift_demands
            if dsd.shift_id in shift_duty_ids and dsd.date in special_day_dates[str(i)]
        )
        for i in special_day_indexes
    }

    # build a dictionary with key worker_id, and value a dict with for each
    # special day label the number of work days on special days for each this
    # worker
    worker_coefficients = calculate_adjustment_coefficients(
        workers,
        shifts,
        requests,
        special_day_dates,
        special_day_indexes,
        worker_ids_to_worker_dates,
        fixed_assignments,
    )

    # proportional_times: Dict[str, List[float]]
    out = allocate_duties_on_special_days_to_workers(
        special_day_indexes,
        special_day_dates,
        special_day_nb_duties,
        worker_coefficients,
        worker_ids_to_worker_dates,
    )
    return out


def get_ltm_dates(dates_hist: List[date], dates_campaign: List[date]) -> List[date]:
    combined_dates = dates_hist + dates_campaign
    last_date_campaign = max(dates_campaign)
    twelve_months_ago = last_date_campaign - timedelta(days=365)
    filtered_dates = [d for d in combined_dates if d >= twelve_months_ago]
    return filtered_dates


def calculate_adjustment_coefficients(
    workers: List[Worker],
    shifts: List[Shift],
    requests: List[Request],
    special_day_dates: Dict[str, List[date]],
    special_day_indexes: List[int],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    fixed_assignments: List[Assignment],
) -> Dict[str, Dict[str, float]]:
    shift_leave_ids = [s.id for s in shifts if s.shift_type == ShiftType.LEAVE]
    worker_request_leave_dates = {}
    for w in workers:
        w_request_leave = []
        for r in requests:
            if r.worker_id == w.id and r.shift_id in shift_leave_ids:
                r_dates = [
                    r.start_date + timedelta(days=i)
                    for i in range((r.end_date - r.start_date).days + 1)
                ]
                w_request_leave.extend(r_dates)
        worker_request_leave_dates[w.id] = {
            str(i): [d for d in special_day_dates[str(i)] if d in w_request_leave]
            for i in special_day_indexes
        }

    worker_special_days = {
        w.id: {
            str(i): max(
                sum(
                    1
                    for d in worker_ids_to_worker_dates[w.id].dates_hist
                    + worker_ids_to_worker_dates[w.id].dates_campaign
                    if d in special_day_dates[str(i)]
                    and d not in worker_request_leave_dates[w.id][str(i)]
                )
                - sum(
                    1
                    for a in fixed_assignments
                    if a.worker_id == w.id
                    and a.date in special_day_dates[str(i)]
                    and a.date in worker_ids_to_worker_dates[w.id].dates_hist
                    and a.shift_id in shift_leave_ids
                ),
                0,
            )
            for i in special_day_indexes
        }
        for w in workers
    }

    worker_coefficients = {
        w.id: {
            str(i): (
                worker_special_days[w.id][str(i)]
                / sum(worker_special_days[wj][str(i)] for wj in worker_special_days)
                if sum(worker_special_days[wj][str(i)] for wj in worker_special_days)
                > 0
                else 1 / len(worker_special_days)
            )
            for i in special_day_indexes
        }
        for w in workers
    }

    return worker_coefficients


def allocate_duties_on_special_days_to_workers(
    special_day_indexes: List[int],
    special_day_dates: Dict[str, List[date]],
    special_day_nb_duties: Dict[str, int],
    worker_coefficients: Dict[str, Dict[str, float]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
) -> Dict[str, Dict[str, Dict[str, int | List[date]]]]:
    out: Dict[str, Dict[str, Dict[str, int | List[date]]]] = {}
    w_to_targets = {
        w_id: [
            special_day_nb_duties[str(i)] * worker_coefficients[w_id][str(i)]
            for i in special_day_indexes
        ]
        for w_id in worker_coefficients
    }
    w_to_targets_rounded = round_proportional_times(w_to_targets)
    for w_id, targets in w_to_targets_rounded.items():
        for i, target in enumerate(targets):
            if w_id not in out:
                out[w_id] = {}
            out[w_id][str(special_day_indexes[i])] = {
                "target": target,
                "dates": [
                    d
                    for d in special_day_dates[str(special_day_indexes[i])]
                    if d
                    in worker_ids_to_worker_dates[w_id].dates_hist
                    + worker_ids_to_worker_dates[w_id].dates_campaign
                ],
            }
    return out
