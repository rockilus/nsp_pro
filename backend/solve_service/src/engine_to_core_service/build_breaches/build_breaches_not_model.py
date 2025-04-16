from datetime import date
from typing import Dict, List

from shared.schemas.core import (
    Assignment,
    Breach,
    ObjectiveCategory,
    Schedule,
    Shift,
    ShiftType,
    Variable,
    Worker,
)

from engine import ProcessingCache
from utils.constants import Constants


# pylint: disable=too-many-arguments
def build_breaches_not_model(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    processing_cache: ProcessingCache,
) -> List[Breach]:
    out = build_work_time_breaches(
        schedule,
        workers,
        shifts,
        processing_cache.periods_weekly,
        processing_cache.w_to_work_times,
        processing_cache.shift_id_to_duration,
        assignments,
    )
    out += build_nb_duty_breaches(
        schedule,
        workers,
        shifts,
        processing_cache.periods_monthly,
        processing_cache.w_to_nb_duties,
        assignments,
    )
    return out


#########################
# Work time breaches
#########################


# pylint: disable=too-many-arguments, too-many-locals, R0801
def build_work_time_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    periods: List[List[date]],
    w_to_work_times: Dict[str, Dict[str, List[int]]],
    shift_id_to_duration_dict: Dict[str, int],
    assignments: List[Assignment],
) -> List[Breach]:
    # Calculate work time actual for each period
    shift_work_ids = [
        s.id for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]

    w_to_wt_actual = calc_work_times_actual(
        workers,
        shift_work_ids,
        periods,
        shift_id_to_duration_dict,
        assignments,
    )

    # Compare to work time expected and create breach when actual > expected
    i_to_period: Dict[int, List[date]] = dict(enumerate(periods))

    out: List[Breach] = []
    for w_id, w_work_times in w_to_work_times.items():
        wts_actual = w_to_wt_actual.get(w_id, None)
        if wts_actual is None:
            continue
        for category, wts_expected in w_work_times.items():
            if category not in ["desired", "contract"]:
                continue
            obj_category = (
                ObjectiveCategory.WORK_TIME_DESIRED
                if category == "desired"
                else ObjectiveCategory.WORK_TIME_CONTRACT
            )
            for i, (wt_actual, wt_expected) in enumerate(zip(wts_actual, wts_expected)):
                if wt_actual > wt_expected:
                    period = i_to_period[i]
                    period_start, period_end = period[0], period[-1]
                    worker = next((w for w in workers if w.id == w_id), None)
                    if worker is None:
                        continue

                    string_list = [
                        worker.name,
                        (
                            "open to work"
                            if obj_category == ObjectiveCategory.WORK_TIME_DESIRED
                            else "contracted"
                        ),
                        f"{str(convert_minutes_to_hours(wt_expected))}h/week",
                        "but works",
                        f"{str(convert_minutes_to_hours(wt_actual))}h",
                        "on week",
                        f"{period_start.strftime('%b %d')} - "
                        + f"{period_end.strftime('%b %d')}",
                    ]

                    out.append(
                        Breach(
                            id="",
                            schedule_id=schedule.id,
                            objective_id=None,
                            objective_category=obj_category,
                            variables=[
                                Variable(worker_id=w_id, date=d, shift_id=s_id)
                                for d in period
                                for s_id in shift_work_ids
                            ],
                            description=" ".join(string_list),
                            hard_to_soft=None,
                        )
                    )
    return out


def calc_work_times_actual(
    workers: List[Worker],
    shift_work_ids: List[str],
    periods: List[List[date]],
    shift_id_to_duration_dict: Dict[str, int],
    assignments: List[Assignment],
) -> Dict[str, List[int]]:
    w_not_deleted_ids = [w.id for w in workers if not w.deleted]

    w_to_wt_actual: Dict[str, List[int]] = {}
    for w_id in w_not_deleted_ids:
        w_to_wt_actual[w_id] = []
        for period in periods:
            as_w = [
                a
                for a in assignments
                if a.worker_id == w_id
                and a.date in period
                and a.shift_id in shift_work_ids
            ]
            wt_actual = sum(shift_id_to_duration_dict[a.shift_id] for a in as_w)
            w_to_wt_actual[w_id].append(wt_actual)
    return w_to_wt_actual


def convert_minutes_to_hours(minutes: int) -> float:
    return round(minutes / Constants.NUM_MINUTES_HOUR)


#########################
# Nb duty breaches
#########################


def build_nb_duty_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    periods: List[List[date]],
    w_to_nb_duties: Dict[str, Dict[str, List[int]]],
    assignments: List[Assignment],
) -> List[Breach]:
    # Calculate nb duty actual for each period
    shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]

    w_to_nb_duty_actual = calc_nb_duty_actual(
        workers,
        shift_duty_ids,
        periods,
        assignments,
    )

    # Compare to nb duty expected and create breach when actual > expected
    i_to_period: Dict[int, List[date]] = dict(enumerate(periods))

    out: List[Breach] = []
    for w_id, nb_duty_expected in w_to_nb_duties.items():
        nb_duty_actual = w_to_nb_duty_actual.get(w_id, None)
        if nb_duty_actual is None:
            continue
        for category, nds_expected in nb_duty_expected.items():
            if category != "desired":
                continue
            for i, (nd_actual, nd_expected) in enumerate(
                zip(nb_duty_actual, nds_expected)
            ):
                if nd_actual > nd_expected:
                    period = i_to_period[i]
                    period_start, period_end = period[0], period[-1]
                    worker = next((w for w in workers if w.id == w_id), None)
                    if worker is None:
                        continue

                    string_list = [
                        worker.name,
                        "open to work",
                        f"{str(nd_expected)} duties/month",
                        "but works",
                        str(nd_actual),
                        "on month",
                        f"{period_start.strftime('%b %d')} - "
                        + f"{period_end.strftime('%b %d')}",
                    ]

                    out.append(
                        Breach(
                            id="",
                            schedule_id=schedule.id,
                            objective_id=None,
                            objective_category=ObjectiveCategory.DUTIES_PER_MONTH,
                            variables=[
                                Variable(worker_id=w_id, date=d, shift_id=s_id)
                                for d in period
                                for s_id in shift_duty_ids
                            ],
                            description=" ".join(string_list),
                            hard_to_soft=None,
                        )
                    )
    return out


def calc_nb_duty_actual(
    workers: List[Worker],
    shift_duty_ids: List[str],
    periods: List[List[date]],
    assignments: List[Assignment],
) -> Dict[str, List[int]]:
    w_not_deleted_ids = [w.id for w in workers if not w.deleted]

    out: Dict[str, List[int]] = {}
    for w_id in w_not_deleted_ids:
        out[w_id] = []
        for period in periods:
            as_w = [
                a
                for a in assignments
                if a.worker_id == w_id
                and a.date in period
                and a.shift_id in shift_duty_ids
            ]
            out[w_id].append(len(as_w))
    return out
