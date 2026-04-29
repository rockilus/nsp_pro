import calendar
import math
from datetime import date, timedelta

from shared.schemas.core import (
    Request,
    Schedule,
    Shift,
    ShiftDemandNew,
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
    periods: list[list[date]],
    w_to_nb_duties: dict[str, dict[str, list[int]]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shifts_duty: list[Shift],
    penalty: int,
    tolerance: float,
) -> list[GroupsAssignmentsTargetConstraint]:
    #     len(periods)
    # List[GroupsAssignmentsTargetConstraint]=
    #         len(workers) x len(shifts duty) * len(period)
    #     assignments: List[List[Tuple[str, str, str]]]
    #         len(workers)
    #     targets: List[int]
    #     penalty: int
    #     tolerance: int
    p_index_to_period: dict[int, list[date]] = dict(enumerate(periods))

    p_index_to_gadtc: dict[int, GroupsAssignmentsTargetConstraint] = {}
    for w_id, nb_duties in w_to_nb_duties.items():
        target_work_times = nb_duties["target"]
        for i, period in p_index_to_period.items():
            if len(period) == 0:
                continue
            assignments = [
                (w_id, d.isoformat(), s.id)
                for d in period
                for s in shifts_duty
                if d
                in ws_to_dates[(w_id, s.id)].dates_hist
                + ws_to_dates[(w_id, s.id)].dates_campaign
                and d in period
            ]
            if not assignments:
                continue
            targets = target_work_times[i]
            if i not in p_index_to_gadtc:
                p_index_to_gadtc[i] = GroupsAssignmentsTargetConstraint(
                    assignments=[assignments],
                    targets=[targets],
                    penalty=penalty,
                    tolerance=tolerance,
                )
            else:
                p_index_to_gadtc[i].assignments.append(assignments)
                p_index_to_gadtc[i].targets.append(targets)
    return list(p_index_to_gadtc.values())


def calculate_auto_gap(
    workers: list[Worker],
    w_to_nb_duties: dict[str, dict[str, list[int]]],
    periods_monthly: list[list[date]],
) -> dict[str, int]:
    """Calculate a per-worker minimum duty gap for the campaign.

    Strategy (Option B — "N+1 duties" slack):
      For each worker we compute how many days apart their duties should
      naturally fall if we spread them evenly over the campaign, then give
      the solver a bit of breathing room by pretending the worker has one
      extra duty (denominator = desired + 1).  This shrinks the enforced
      gap just enough so the solver is not over-constrained while still
      preventing duties from clumping.

    Formula per worker:
      total_days   = sum of all monthly period lengths in the campaign
      total_desired = sum of w_to_nb_duties[w.id]["desired"] across periods
                      (already leave-adjusted via the coefficient in
                      calculate_worker_nb_duties — workers on long leave
                      automatically get fewer desired duties and thus a
                      larger natural gap)
      raw_gap = floor(total_days / (total_desired + 1))
      gap     = clamp(raw_gap, min=1, max=14)

    Clamps:
      • min=1  prevents a vacuous 0-day gap (no constraint at all)
      • max=14 prevents a uselessly large gap for workers with very few duties

    Args:
        workers:          List of non-deleted workers.
        w_to_nb_duties:   Output of calculate_worker_nb_duties — maps
                          worker_id → {"desired": [...], "max": [...], "target": [...]}.
        periods_monthly:  Monthly period lists (same as those passed to
                          calculate_worker_nb_duties).

    Returns:
        dict mapping worker_id → gap in days (int, in [1, 14]).
    """
    # Total number of campaign days is the same for all workers — it is the
    # raw sum of monthly period lengths, not leave-adjusted.  Leave is already
    # baked into the "desired" figures, so we do not double-deduct it here.
    total_campaign_days = sum(len(p) for p in periods_monthly)

    worker_gaps: dict[str, int] = {}
    for w in workers:
        # Sum the desired duty counts across all periods for this worker.
        # w_to_nb_duties may be missing a worker if they have no duty data;
        # treat that as 0 desired duties → fall back to the maximum gap cap.
        desired_duties = sum(w_to_nb_duties.get(w.id, {}).get("desired", []))

        if desired_duties == 0 or total_campaign_days == 0:
            # Worker has no duties to schedule: cap the gap to avoid a
            # vacuous constraint that would still generate many pair variables.
            worker_gaps[w.id] = 14
        else:
            # Denominator is desired + 1: act as if the worker is one duty
            # busier than planned.  For a worker with 2 duties/month (30 days):
            #   floor(30 / 3) = 10  instead of  floor(30 / 2) = 15
            # This retains meaningful spread while giving the solver slack.
            raw_gap = total_campaign_days // (desired_duties + 1)
            worker_gaps[w.id] = max(1, min(14, raw_gap))

    return worker_gaps


# pylint: disable=too-many-locals, too-many-arguments, R0801
def calculate_worker_nb_duties(
    schedule: Schedule,
    workers: list[Worker],
    shifts: list[Shift],
    requests: list[Request],
    shift_demands: list[ShiftDemandNew],
    periods: list[list[date]],
) -> dict[str, dict[str, list[int]]]:
    # [
    # key: worker_id,
    # value: {
    #   key: [desired, max, target],
    #   value: [target nb of duties for each period]}
    # ]
    worker_nb_duties: dict[str, dict[str, list[int]]] = {}

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
    workers: list[Worker],
    shifts: list[Shift],
    shift_demands: list[ShiftDemandNew],
    periods: list[list[date]],
    w_id_to_coef: dict[str, list[float]],
) -> dict[str, list[int]]:

    period_index_to_required_nb_duties = {}
    # Build quick lookup for shifts by id
    shift_dict = {s.id: s for s in shifts}
    for period_index, period in enumerate(periods):
        shift_duty_ids = [s.id for s in shifts if s.shift_type == ShiftType.DUTY]
        period_dsds_duty = [
            dsd
            for dsd in shift_demands
            if dsd.date in period and dsd.shift_id in shift_duty_ids
        ]
        total_required = 0
        for dsd in period_dsds_duty:
            shift = shift_dict.get(dsd.shift_id)
            if not shift:
                continue
            # total staffing for the shift (sum of staffing entries)
            total_staffing = (
                sum(s.staffing for s in shift.staffing) if shift.staffing else 0
            )
            if total_staffing == 0:
                # no staffing configured -> contributes 0
                continue
            total_required += dsd.count * total_staffing

        period_index_to_required_nb_duties[period_index] = total_required
    total_period_desired_nb_duties: list[float] = [
        sum(worker.duties_per_month * w_id_to_coef[worker.id][i] for worker in workers)
        for i in range(len(periods))
    ]

    w_id_to_target_nb_duties_by_period: dict[str, list[float]] = {}
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


def get_nb_days_in_months(dates_list: list[list[date]]) -> list[int]:
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


def build_max_weekly_nb_duties_vars(
    worker_not_deleted: list[Worker],
    shift_duties_not_deleted: list[Shift],
    periods_weekly: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
) -> list[list[list[tuple[str, str, str]]]]:
    """Builds max weekly nb duties variables structure.

    Returns a list per week. Each week is a list of workers (only workers
    that have at least one duty assignment in that week). Each worker entry
    is a list of tuples (worker_id, date_iso, shift_id). No inner sublists
    are empty; if a worker has no duty assignments in a week it is omitted
    from that week's list. If no weeks contain any assignments an empty
    list is returned.
    """
    weeks: list[list[list[tuple[str, str, str]]]] = []
    for week in periods_weekly:
        week_entries: list[list[tuple[str, str, str]]] = []
        if not week:
            # skip empty week periods to avoid empty sublists
            continue
        for w in worker_not_deleted:
            worker_assignments: list[tuple[str, str, str]] = []
            for d in week:
                for s in shift_duties_not_deleted:
                    key = (w.id, s.id)
                    if key not in ws_to_dates:
                        continue
                    wdates = (
                        ws_to_dates[key].dates_hist + ws_to_dates[key].dates_campaign
                    )
                    if d in wdates:
                        worker_assignments.append((w.id, d.isoformat(), s.id))
            if worker_assignments:
                week_entries.append(worker_assignments)
        if week_entries:
            weeks.append(week_entries)
    return weeks


def build_max_week_day_nb_duties_vars(
    worker_not_deleted: list[Worker],
    shift_duties_not_deleted: list[Shift],
    dates_campaign: list[date],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
) -> list[list[list[tuple[str, str, str]]]]:
    """Builds max weekday nb duties variables structure from campaign dates.

    Returns a list per weekday (Monday=0 .. Sunday=6). Each weekday is a list
    of workers (only workers that have at least one duty assignment on that
    weekday across the campaign). Each worker entry is a list of tuples
    (worker_id, date_iso, shift_id). No inner sublists are empty; if a worker
    has no duty assignments on that weekday it is omitted from that weekday's
    list. If no weekdays contain any assignments an empty list is returned.
    """
    # collect all dates for each weekday from the flat campaign dates list
    weekdays: list[list[date]] = [[] for _ in range(7)]
    for d in dates_campaign:
        weekdays[d.weekday()].append(d)

    weekday_entries_all: list[list[list[tuple[str, str, str]]]] = []
    for weekday_dates in weekdays:
        day_entries: list[list[tuple[str, str, str]]] = []
        if not weekday_dates:
            # skip empty weekday periods to avoid empty sublists
            continue
        for w in worker_not_deleted:
            worker_assignments: list[tuple[str, str, str]] = []
            for d in weekday_dates:
                for s in shift_duties_not_deleted:
                    key = (w.id, s.id)
                    if key not in ws_to_dates:
                        continue
                    wdates = (
                        ws_to_dates[key].dates_hist + ws_to_dates[key].dates_campaign
                    )
                    if d in wdates:
                        worker_assignments.append((w.id, d.isoformat(), s.id))
            if worker_assignments:
                day_entries.append(worker_assignments)
        if day_entries:
            weekday_entries_all.append(day_entries)
    return weekday_entries_all


def build_consecutive_duty_gap_vars(
    worker_not_deleted: list[Worker],
    shift_duties_not_deleted: list[Shift],
    dates_campaign: list[date],
    dates_hist: list[date],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    min_gap_days: int | dict[str, int] = 1,
) -> list[tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]]:
    """Builds (day_d_vars, day_d+k_vars) pairs for consecutive duty gap penalty.

    For each worker, for each date d in (dates_hist + dates_campaign) and for
    each k in 1..worker_gap, if d+k is a campaign date we collect duty vars
    on d and on d+k.  The pair is included only when both sides are non-empty.

    Historical dates are naturally handled: if d is historical, the duty var is
    fixed by the solver, which pushes campaign assignments away from h+k dates
    that follow a historical duty.

    Args:
        worker_not_deleted:      Non-deleted workers.
        shift_duties_not_deleted: Non-deleted duty shifts.
        dates_campaign:          Campaign dates (mutable by solver).
        dates_hist:              Historical dates (fixed by solver).
        ws_to_dates:             (worker_id, shift_id) → WorkerDates mapping.
        min_gap_days:            Either a single int applied to every worker, or
                                 a dict mapping worker_id → gap in days.  The
                                 dict form (produced by calculate_auto_gap) allows
                                 per-worker gaps so that high-load workers get a
                                 tighter gap and low-load workers get a wider one.
    """

    campaign_date_set = set(dates_campaign)
    all_dates = dates_hist + dates_campaign
    pairs: list[tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]] = []

    for w in worker_not_deleted:
        # Resolve this worker's gap: use their individual value when the caller
        # provides a dict (auto mode), or fall back to the global scalar (set mode).
        if isinstance(min_gap_days, dict):
            # Default to 1 if the worker somehow has no entry in the dict —
            # this should not happen in practice but guards against key errors.
            worker_gap = min_gap_days.get(w.id, 1)
        else:
            worker_gap = min_gap_days

        for d in all_dates:
            # k runs from 1 to worker_gap inclusive.  Each k generates one pair
            # (day d, day d+k), meaning d+k must be a rest day if d has a duty.
            # Using multiple k values for a single gap > 1 is intentional: it
            # penalises *every* forbidden near-neighbour, not just the closest one.
            for k in range(1, worker_gap + 1):
                d_next = d + timedelta(days=k)
                if d_next not in campaign_date_set:
                    continue
                vars_d: list[tuple[str, str, str]] = []
                vars_next: list[tuple[str, str, str]] = []
                for s in shift_duties_not_deleted:
                    key = (w.id, s.id)
                    if key not in ws_to_dates:
                        continue
                    wdates = (
                        ws_to_dates[key].dates_hist + ws_to_dates[key].dates_campaign
                    )
                    if d in wdates:
                        vars_d.append((w.id, d.isoformat(), s.id))
                    if d_next in wdates:
                        vars_next.append((w.id, d_next.isoformat(), s.id))
                if vars_d and vars_next:
                    pairs.append((vars_d, vars_next))
    return pairs
