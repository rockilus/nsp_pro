import json
from datetime import date
from typing import Dict, List

from shared.schemas import (
    Assignment,
    Breach,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    DailyShiftDemand,
    LinkShift,
    ObjectiveCategory,
    Request,
    Schedule,
    Shift,
    ShiftType,
    Variable,
    Worker,
)

from engine import Breach as BreachEngine
from engine import VarName as VarNameEngine


# pylint: disable=too-many-arguments
def build_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demands: List[DailyShiftDemand],
    assignments: List[Assignment],
    constraints: Constraints,
    requests: List[Request],
    breaches_engine: List[BreachEngine],
) -> List[Breach]:
    breaches = _parse_breaches_engine(schedule, breaches_engine)
    breaches = [
        b
        for b in breaches
        if b.objective_category != ObjectiveCategory.DAILY_SHIFT_DEMAND
    ]
    for breach in breaches:
        breach.description = _build_breach_description(
            workers,
            shifts,
            link_shifts,
            assignments,
            constraints,
            requests,
            breach,
        )
    breaches += _build_daily_shift_demand_breaches(
        schedule,
        shifts,
        daily_shift_demands,
        assignments,
    )
    return breaches


def _parse_breaches_engine(
    schedule: Schedule, breaches_engine: List[BreachEngine]
) -> List[Breach]:
    out: List[Breach] = []
    for be in breaches_engine:
        try:
            var_name = VarNameEngine(**json.loads(be.var_name))
        except Exception:
            # log_info(f"Error parsing var_name: {e}")
            print(f"Error parsing var_name: {be.var_name}")
            continue
        variables = [
            (v[0], date.fromisoformat(v[1]), v[2])
            for v in [v.split("_") for v in var_name.cstr_vars]
        ]
        if var_name.objective_category == ObjectiveCategory.LINK_SHIFT.value:
            ls_id = var_name.objective_id
            date_breach = variables[0][1]
            breach_exist = next(
                (
                    b
                    for b in out
                    if b.objective_id == ls_id and b.variables[0].date == date_breach
                ),
                None,
            )
            if breach_exist is not None:
                continue
        out.append(
            Breach(
                id="",
                schedule_id=schedule.id,
                objective_id=var_name.objective_id,
                objective_category=ObjectiveCategory(var_name.objective_category),
                variables=[Variable(*v) for v in variables],
                description="",
                hard_to_soft=var_name.hard_to_soft,
            )
        )
    return out


# pylint: disable=too-many-return-statements
def _build_breach_description(
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    assignments: List[Assignment],
    constraints: Constraints,
    requests: List[Request],
    breach: Breach,
) -> str:
    if breach.objective_category == ObjectiveCategory.CONSTRAINT:
        if breach.objective_id is None:
            raise ValueError("Objective id is missing")
        constraint = _get_constraint_by_id(breach.objective_id, constraints)
        if constraint is None:
            raise ValueError(f"Constraint with id {breach.objective_id} not found")
        if isinstance(constraint, ConstraintSum):
            return _build_description_breach_constraint_sum(
                workers,
                shifts,
                assignments,
                constraint,
                breach,
            )
        if isinstance(constraint, ConstraintSeq):
            return _build_description_breach_constraint_seq(
                workers,
                shifts,
                assignments,
                constraint,
                breach,
            )
        if isinstance(constraint, ConstraintOrd):
            return _build_description_breach_constraint_ord(
                workers,
                shifts,
                assignments,
                constraint,
                breach,
            )
        if isinstance(constraint, ConstraintFil):
            return _build_description_breach_constraint_fil(
                workers,
                shifts,
                breach,
            )
        return f"{constraint.constraint_type} constraint not implemented yet"
    if breach.objective_category == ObjectiveCategory.REQUEST:
        return _build_description_breach_request(
            workers,
            shifts,
            assignments,
            requests,
            breach,
        )
    if breach.objective_category in [
        ObjectiveCategory.WORK_TIME_CONTRACT,
        ObjectiveCategory.WORK_TIME_DESIRED,
    ]:
        return _build_description_breach_work_time(
            workers,
            shifts,
            assignments,
            breach,
        )
    if breach.objective_category == ObjectiveCategory.DUTIES_PER_MONTH:
        return _build_description_breach_nb_duties(
            workers,
            shifts,
            assignments,
            breach,
        )
    if breach.objective_category == ObjectiveCategory.LINK_SHIFT:
        return _build_description_link_shift_breach(
            workers,
            shifts,
            assignments,
            link_shifts,
            breach,
        )
    if breach.objective_category == ObjectiveCategory.DUTY_RECUP:
        return _build_description_duty_recup_breach(workers, shifts, breach)
    return f"{breach.objective_category} constraint not implemented yet"


def _get_constraint_by_id(
    constraint_id: str, constraints: Constraints
) -> (
    ConstraintSum | ConstraintSeq | ConstraintOrd | ConstraintFil | ConstraintFai | None
):
    constraints_flat = (
        constraints.sum
        + constraints.seq
        + constraints.ord
        + constraints.fil
        + constraints.fai
    )
    for constraint in constraints_flat:
        if constraint.id == constraint_id:
            return constraint
    return None


def _build_description_breach_constraint_sum(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    constraint: ConstraintSum,
    breach: Breach,
) -> str:
    # 1 shift off too many/short on period Oct 2 - Oct 8
    workers_id = set(v.worker_id for v in breach.variables)
    dates = set(v.date for v in breach.variables)
    start_date, end_date = min(dates), max(dates)
    shifts_id = set(v.shift_id for v in breach.variables)
    ws_breach = [w for w in workers if w.id in workers_id]
    ss_breach = [s for s in shifts if s.id in shifts_id]
    count = sum(
        1
        for a in assignments
        if a.worker_id in workers_id and a.date in dates and a.shift_id in shifts_id
    )
    diff = count - constraint.target_value
    string_list = [
        str(abs(diff)),
        "shifts" if abs(diff) > 1 else "shift",
        " ".join([s.name for s in ss_breach]),
        "too many" if diff > 0 else "short",
        "on period",
        f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
        "for",
        " ".join([w.name for w in ws_breach]),
    ]
    return " ".join(string_list)


def _build_description_breach_constraint_seq(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    constraint: ConstraintSeq,
    breach: Breach,
) -> str:
    # 1 shift off consecutive too many/short on period Oct 2 - Oct 8
    workers_id = set(v.worker_id for v in breach.variables)
    dates = set(v.date for v in breach.variables)
    start_date, end_date = min(dates), max(dates)
    shifts_id = set(v.shift_id for v in breach.variables)
    ws_breach = [w for w in workers if w.id in workers_id]
    ss_breach = [s for s in shifts if s.id in shifts_id]
    count = sum(
        1
        for a in assignments
        if a.worker_id in workers_id and a.date in dates and a.shift_id in shifts_id
    )
    diff = count - constraint.target_value
    string_list = [
        str(abs(diff)),
        "shifts" if abs(diff) > 1 else "shift",
        " ".join([s.name for s in ss_breach]),
        "consecutive",
        "too many" if diff > 0 else "short",
        "on period" if len(dates) > 1 else "on",
        (
            f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
            if len(dates) > 1
            else f"{start_date.strftime('%b %d')}"
        ),
        "for",
        " ".join([w.name for w in ws_breach]),
    ]
    return " ".join(string_list)


def _build_description_breach_constraint_ord(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    constraint: ConstraintOrd,
    breach: Breach,
) -> str:
    # No:
    # Shift morning 1 day after/before shift night
    # Yes:
    # Shift afternoon 1 day after/before shift night instead of shift morning
    workers_id = set(v.worker_id for v in breach.variables)
    d_reference, d_relative = (
        breach.variables[0].date,
        breach.variables[1].date,
    )
    ws_breach = [w for w in workers if w.id in workers_id]
    ss_reference = [s for s in shifts if s.id in constraint.shift_reference_ids]
    ss_relative = [s for s in shifts if s.id in constraint.shift_relative_ids]
    a_d_relative = next(
        (a for a in assignments if a.worker_id in workers_id and a.date == d_relative),
        None,
    )
    if a_d_relative is None:
        shift_assigned_name = "unknown"
    else:
        s_d_relative = next(
            (s for s in ss_relative if s.id == a_d_relative.shift_id),
            None,
        )
        shift_assigned_name = s_d_relative.name if s_d_relative else "unknown"
    string_list = [
        "Shift",
        shift_assigned_name,
        str(abs(constraint.interval)),
        "day" if abs(constraint.interval) <= 1 else "days",
        "after" if constraint.interval >= 0 else "before",
        "shift",
        ", ".join([s.name for s in ss_reference]),
        "on",
        d_reference.strftime("%b %d"),
        (
            f"instead of shift {', '.join([s.name for s in ss_relative])}"
            if constraint.operator == ConstraintOperator.YES
            else ""
        ),
        "for",
        " ".join([w.name for w in ws_breach]),
    ]
    return " ".join(string_list)


def _build_description_breach_constraint_fil(
    workers: List[Worker],
    shifts: List[Shift],
    breach: Breach,
) -> str:
    # No:
    # No Plouharnel worker should work in Vannes site.
    # Yes:
    # Plouharnel worker should only work in Plouharnel site.
    workers_id = set(v.worker_id for v in breach.variables)
    dates = set(v.date for v in breach.variables)
    shifts_id = set(v.shift_id for v in breach.variables)
    ws_breach = [w for w in workers if w.id in workers_id]
    ss_breach = [s for s in shifts if s.id in shifts_id]
    # a_conflict = [
    #     a for a in assignments if a.worker_id in workers_id and a.date in dates
    # ]
    # shift_assigned_names = [
    #     shift_db.get_shift_by_id(a.shift_id).name for a in a_conflict
    # ]
    string_list = [
        "Shift",
        " ".join([s.name for s in ss_breach]),
        # " ".join(shift_assigned_names),
        "on",
        " ".join([f"{d.strftime('%b %d')}" for d in dates]),
        "for",
        " ".join([w.name for w in ws_breach]),
        "not allowed",
    ]
    return " ".join(string_list)


def _build_description_breach_request(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    requests: List[Request],
    breach: Breach,
) -> str:
    request = next((r for r in requests if r.id == breach.objective_id), None)
    worker = next((w for w in workers if w.id == breach.variables[0].worker_id), None)
    dates = list(set(v.date for v in breach.variables))
    start_date, end_date = min(dates), max(dates)
    shift = next((s for s in shifts if s.id == breach.variables[0].shift_id), None)
    if request is None or worker is None or shift is None:
        return "Unknown request, worker or shift"
    shift_actual_ids = set(
        a.shift_id for a in assignments if a.worker_id == worker.id and a.date in dates
    )
    shifts_assigned = [s for s in shifts if s.id in shift_actual_ids]
    shifts_breach_names = [s.name for s in shifts_assigned if s.id != shift.id]
    if request.negative:
        string_list = [
            worker.name,
            "requested not to work",
            shift.name,
            "on",
            (
                dates[0].strftime("%b %d")
                if len(dates) == 1
                else f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
            ),
        ]
    else:
        string_list = [
            worker.name,
            "requested",
            shift.name,
            "on",
            (
                dates[0].strftime("%b %d")
                if len(dates) == 1
                else f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
            ),
            "but works",
            " ".join(shifts_breach_names),
        ]
    return " ".join(string_list)


def _build_description_breach_work_time(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    breach: Breach,
) -> str:
    shifts_work = [
        s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]
    shift_id_to_duration_dict: Dict[str, float] = {
        s.id: (s.end_time - s.start_time).total_seconds() // 3600 for s in shifts_work
    }
    worker = next((w for w in workers if w.id == breach.variables[0].worker_id), None)
    dates = list(set(v.date for v in breach.variables))
    start_date, end_date = min(dates), max(dates)
    if worker is None:
        return "Unknown worker"
    as_work = [
        a
        for a in assignments
        if a.worker_id == worker.id
        and a.date in dates
        and a.shift_id in shift_id_to_duration_dict
    ]
    work_time_target = (
        worker.weekly_hours_desired
        if breach.objective_category == ObjectiveCategory.WORK_TIME_DESIRED
        else worker.weekly_hours
    )
    work_time_actual = round(
        sum(shift_id_to_duration_dict[a.shift_id] for a in as_work)
    )
    string_list = [
        worker.name,
        (
            "open to work"
            if breach.objective_category == ObjectiveCategory.WORK_TIME_DESIRED
            else "contracted"
        ),
        f"{str(work_time_target)}h/week",
        "but works",
        f"{str(work_time_actual)}h",
        "on week",
        f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
    ]
    return " ".join(string_list)


def _build_description_breach_nb_duties(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    breach: Breach,
) -> str:
    shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]
    worker = next((w for w in workers if w.id == breach.variables[0].worker_id), None)
    dates = list(set(v.date for v in breach.variables))
    start_date, end_date = min(dates), max(dates)
    if worker is None:
        return "Unknown worker"
    as_duty = [
        a
        for a in assignments
        if a.worker_id == worker.id and a.date in dates and a.shift_id in shift_duty_ids
    ]
    count_actual = len(as_duty)
    string_list = [
        worker.name,
        "open to work",
        f"{str(worker.duties_per_month)} duties/month",
        "but works",
        str(count_actual),
        "on month",
        f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
    ]
    return " ".join(string_list)


def _build_description_link_shift_breach(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    link_shifts: List[LinkShift],
    breach: Breach,
) -> str:
    link_shift = next((ls for ls in link_shifts if ls.id == breach.objective_id), None)
    if link_shift is None:
        return "Unknown link shift"
    shift_0 = next((s for s in shifts if s.id == link_shift.shift_ids[0]), None)
    shift_1 = next((s for s in shifts if s.id == link_shift.shift_ids[1]), None)
    if shift_0 is None or shift_1 is None:
        return "Unknown linked shifts"
    date_breach = breach.variables[0].date
    as_shift_0 = next(
        (a for a in assignments if a.date == date_breach and a.shift_id == shift_0.id),
        None,
    )
    as_shift_1 = next(
        (a for a in assignments if a.date == date_breach and a.shift_id == shift_1.id),
        None,
    )
    if as_shift_0 is None or as_shift_1 is None:
        return "Unknown assignments"
    worker_0 = next((w for w in workers if w.id == as_shift_0.worker_id), None)
    worker_1 = next((w for w in workers if w.id == as_shift_1.worker_id), None)
    if worker_0 is None or worker_1 is None:
        return "Unknown workers"

    string_list = [
        "Linked shifts",
        shift_0.name,
        "and",
        shift_1.name,
        "done by",
        worker_0.name,
        "and",
        worker_1.name,
        "respectively on",
        date_breach.strftime("%b %d"),
    ]
    return " ".join(string_list)


def _build_daily_shift_demand_breaches(
    schedule: Schedule,
    shifts: List[Shift],
    daily_shift_demands: List[DailyShiftDemand],
    assignments: List[Assignment],
) -> List[Breach]:
    out: List[Breach] = []
    for s in [s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]]:
        dsds = [dsd for dsd in daily_shift_demands if dsd.shift_id == s.id]
        dates_dsds = list(set(dsd.date for dsd in dsds))
        for d in dates_dsds:
            dsds_d = [dsd for dsd in dsds if dsd.date == d]
            count_target = sum(stf.staffing for stf in s.staffing) * sum(
                dsd.count for dsd in dsds_d
            )
            count_actual = sum(
                1 for a in assignments if a.date == d and a.shift_id == s.id
            )
            diff = count_actual - count_target
            if diff != 0:
                out.append(
                    Breach(
                        id="",
                        schedule_id=schedule.id,
                        objective_id=None,
                        objective_category=ObjectiveCategory.DAILY_SHIFT_DEMAND,
                        variables=[
                            Variable(
                                worker_id=None,
                                date=d,
                                shift_id=s.id,
                            )
                        ],
                        description=f"{str(abs(diff))} shifts {s.name} "
                        + f"{'too many' if diff > 0 else 'short'} on "
                        + f"{d.strftime('%b %d')}",
                        hard_to_soft=None,
                    )
                )
    return out


def _build_description_duty_recup_breach(
    workers: List[Worker],
    shifts: List[Shift],
    breach: Breach,
) -> str:
    duty_var = breach.variables[0]
    s_duty = next((s for s in shifts if s.id == duty_var.shift_id), None)
    if s_duty is None:
        return "Unknown duty shift"
    w_duty = next((w for w in workers if w.id == duty_var.worker_id), None)
    if w_duty is None:
        return "Unknown worker"
    string_list = [
        "No recuperation after",
        s_duty.name,
        "for",
        w_duty.name,
        "on",
        duty_var.date.strftime("%b %d"),
    ]
    return " ".join(string_list)


# class Breach:
#     id: str
#     schedule_id: str
#     objective_id: str | None
#     objective_category: ObjectiveCategory
#     variables: List[Variable]
#     description: str
#     hard_to_soft: bool | None


# pylint: disable=too-many-locals
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
    w_not_deleted_ids = [w.id for w in workers if not w.deleted]
    shift_work_ids = [
        s.id for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]
    i_to_period: Dict[int, List[date]] = dict(enumerate(periods))

    w_to_wt_actual: Dict[str, List[int]] = {}
    for w_id in w_not_deleted_ids:
        w_to_wt_actual[w_id] = []
        for period in periods:
            wt_actual = 0
            for d in period:
                as_w = [
                    a
                    for a in assignments
                    if a.worker_id == w_id
                    and a.date == d
                    and a.shift_id in shift_work_ids
                ]
                wt_actual += sum(shift_id_to_duration_dict[a.shift_id] for a in as_w)
            w_to_wt_actual[w_id].append(wt_actual)

    # Compare to work time expected and create breach when actual > expected
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
                        f"{str(wt_expected)}h/week",
                        "but works",
                        f"{str(wt_actual)}h",
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
