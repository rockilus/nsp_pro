from datetime import date, timedelta

from shared.schemas.core import (
    Assignment,
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
    WorkerDates,
)
from shared.schemas.core.multitasking import (
    MultitaskingGroup,
    MultitaskingGroupType,
)
from shared.schemas.core.shift_demand_new import ShiftDemandNew

from engine import Variables as VariablesEngine
from utils.constants import Constants


def build_no_overlap_shift_intervals(
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shifts_not_deleted: list[Shift],
    worker_not_deleted_ids: list[str],
    multitasking_groups: list[MultitaskingGroup],
    shift_demands: list[ShiftDemandNew],
    hist_bleed_vars: set[tuple[str, str, str]] | None = None,
) -> list[list[tuple[str, str, str]]]:
    """
    Returns a list where each element is one AddNoOverlap group (list of assignment tuples).
    Multiple groups per worker are produced when multitasking groups are present.

    LAYER 1 — Type-based filtering:
      Only DUTY, NORMAL, and LEAVE shifts enter any no-overlap group.
      REST shifts (OFF and RECUPERATION) are excluded entirely.

    LAYER 2 — MultitaskingGroup-based partitioning:
      Shifts inside the same group are never placed in the same AddNoOverlap call.
    """
    # ── Step 1: Build demand_id → shift_id index ─────────────────────────────
    demand_id_to_shift_id: dict[str, str] = {
        d.id: d.shift_id for d in shift_demands if d.id is not None
    }

    # ── Step 2: Collect grouped shift_ids, keyed by group index ──────────────
    # Implicit REST group: all REST shifts (OFF + RECUPERATION) share one group so
    # that OFF and RECUPERATION can overlap each other, but neither can overlap
    # with any work shift (DUTY, NORMAL, LEAVE).
    grouped: list[set[str]] = []
    rest_shift_ids: set[str] = {
        s.id for s in shifts_not_deleted if s.shift_type == ShiftType.REST
    }
    if rest_shift_ids:
        grouped.append(rest_shift_ids)

    for mg in multitasking_groups:
        if mg.type.value != MultitaskingGroupType.SHIFT_DEMAND.value:
            continue
        shift_ids_in_group: set[str] = set()
        for demand_id in mg.related_ids:
            sid = demand_id_to_shift_id.get(demand_id)
            if sid:
                shift_ids_in_group.add(sid)
        if len(shift_ids_in_group) >= 2:
            grouped.append(shift_ids_in_group)

    # ── Step 3: Identify all shift_ids that appear in ANY group ──────────────
    all_grouped_shift_ids: set[str] = set().union(*grouped) if grouped else set()

    # ── Step 4: Build the "no-overlap eligible" shift list (Layer 1 filter) ──
    # All non-deleted shifts participate. REST shifts are handled via the implicit
    # group above — excluded from base and placed in their own focal lists.
    no_overlap_eligible: list[Shift] = list(shifts_not_deleted)

    base_shifts: list[Shift] = [
        s for s in no_overlap_eligible if s.id not in all_grouped_shift_ids
    ]
    grouped_shifts: list[Shift] = [
        s for s in no_overlap_eligible if s.id in all_grouped_shift_ids
    ]
    base_ids: list[str] = [s.id for s in base_shifts]

    result: list[list[tuple[str, str, str]]] = []

    for w_id in worker_not_deleted_ids:
        dates = worker_ids_to_worker_dates[w_id].dates_campaign
        # Pre-campaign intervals that bleed into this worker's campaign window.
        # Partition by shift grouping so each bleed var ends up in the same
        # AddNoOverlap group as an equivalent campaign var would.
        worker_bleed = [v for v in (hist_bleed_vars or set()) if v[0] == w_id]
        base_bleed = [v for v in worker_bleed if v[2] not in all_grouped_shift_ids]
        grouped_bleed = [v for v in worker_bleed if v[2] in all_grouped_shift_ids]

        # ── Group A: Base shifts for this worker ─────────────────────────────
        if base_ids:
            group_a = [(w_id, d.isoformat(), s_id) for d in dates for s_id in base_ids]
            group_a.extend(base_bleed)
            result.append(group_a)

        # ── Group B: One AddNoOverlap per grouped shift ───────────────────────
        for s in grouped_shifts:
            co_grouped_ids: set[str] = set()
            for g in grouped:
                if s.id in g:
                    co_grouped_ids.update(g)
            co_grouped_ids.discard(s.id)

            cross_group_ids = [
                other.id
                for other in grouped_shifts
                if other.id not in co_grouped_ids and other.id != s.id
            ]

            group_list = [
                (w_id, d.isoformat(), s_id)
                for d in dates
                for s_id in base_ids + cross_group_ids + [s.id]
            ]
            # Base bleed vars always go in every group (same rule as base_ids).
            group_list.extend(base_bleed)
            # Grouped bleed vars go in this group unless they are co-grouped with
            # the focal shift (co-grouped shifts are allowed to overlap each other).
            group_list.extend(v for v in grouped_bleed if v[2] not in co_grouped_ids)
            if len(group_list) >= 2:
                result.append(group_list)

    return result


# pylint: disable=too-many-locals
def build_engine_variables(
    workers: list[Worker],
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shifts: list[Shift],
    shifts_not_deleted: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
    as_hist: list[Assignment],
    campaign_start: date,
) -> tuple[VariablesEngine, set[tuple[str, str, str]]]:
    assignment_vars: list[tuple[str, str, str]] = []
    shift_interval_vars: list[tuple[int, int, int, tuple[str, str, str]]] = []
    for w in workers:
        for d in worker_ids_to_worker_dates[w.id].dates_hist:
            for s in shifts:
                assignment_vars.append((w.id, d.isoformat(), s.id))

        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            for s in shifts_not_deleted:
                assignment_vars.append((w.id, d.isoformat(), s.id))
                shift_interval_vars.append(
                    build_shift_interval_var(
                        worker_id=w.id,
                        current_date=d,
                        shift=s,
                        shifts=shifts_not_deleted,
                        shift_id_to_duration_dict=shift_id_to_duration_dict,
                    )
                )
                # day_diff_start = 0
                # if s.rest_type == ShiftRestType.RECUPERATION:
                #     s_duty = next(
                #         (
                #             shift
                #             for shift in shifts_not_deleted
                #             if shift.shift_type == ShiftType.DUTY
                #             and shift.id == s.recuperation_duty_id
                #         ),
                #         None,
                #     )
                #     if s_duty is None:
                #         raise ValueError(
                #             f"Shift {s.id} is a recuperation shift but the duty "
                #             + f"shift {s.recuperation_duty_id} is not found."
                #         )
                #     day_diff_start = (
                #         s_duty.end_time.date() - s_duty.start_time.date()
                #     ).days
                # s_duration = shift_id_to_duration_dict[s.id]
                # s_start_time = int(
                #     (
                #         s.start_time.replace(year=d.year, month=d.month, day=d.day)
                #         + timedelta(days=day_diff_start)
                #     ).timestamp()
                #     // Constants.NUM_SECONDS_MINUTE
                # )
                # day_diff_end = (
                #     s.end_time.date() - s.start_time.date()
                # ).days + day_diff_start
                # s_end_time = int(
                #     (
                #         s.end_time.replace(year=d.year, month=d.month, day=d.day)
                #         + timedelta(days=day_diff_end)
                #     ).timestamp()
                #     // Constants.NUM_SECONDS_MINUTE
                #     - 1
                # )
                # shift_interval_vars.append(
                #     (
                #         s_start_time,
                #         s_duration,
                #         s_end_time,
                #         (w.id, d.isoformat(), s.id),
                #     )
                # )
    hist_bleed_ivars = build_hist_bleed_shift_intervals(
        as_hist=as_hist,
        shifts=shifts,
        shifts_not_deleted=shifts_not_deleted,
        campaign_start=campaign_start,
        shift_id_to_duration_dict=shift_id_to_duration_dict,
    )
    shift_interval_vars.extend(hist_bleed_ivars)
    hist_bleed_var_keys: set[tuple[str, str, str]] = {iv[3] for iv in hist_bleed_ivars}

    return (
        VariablesEngine(
            assignments=assignment_vars,
            shift_intervals=shift_interval_vars,
        ),
        hist_bleed_var_keys,
    )


def build_hist_bleed_shift_intervals(
    as_hist: list[Assignment],
    shifts: list[Shift],
    shifts_not_deleted: list[Shift],
    campaign_start: date,
    shift_id_to_duration_dict: dict[str, int],
) -> list[tuple[int, int, int, tuple[str, str, str]]]:
    """
    Returns shift_interval_var entries for historical assignments whose computed
    time interval bleeds into (or starts within) the campaign period.

    These must be added to variables.shift_intervals so the engine creates
    NewOptionalIntervalVar entries for them, enabling AddNoOverlap enforcement
    against campaign assignments.

    Handles two cases:
      - Overnight shifts whose end falls on or after campaign_start.
      - Recuperation shifts whose interval (starting at duty-end) overlaps the
        campaign window, even though the assignment date is pre-campaign.
    """
    from datetime import datetime

    valid_shift_ids: set[str] = {s.id for s in shifts_not_deleted}
    shift_map: dict[str, Shift] = {s.id: s for s in shifts}

    # Compute campaign start in minutes using the same naive-datetime convention
    # as build_shift_interval_var, so comparisons are consistent.
    campaign_start_minutes = int(
        datetime(
            campaign_start.year,
            campaign_start.month,
            campaign_start.day,
        ).timestamp()
        // Constants.NUM_SECONDS_MINUTE
    )

    result: list[tuple[int, int, int, tuple[str, str, str]]] = []
    seen: set[tuple[str, str, str]] = set()

    for a in as_hist:
        if a.shift_id not in valid_shift_ids:
            continue
        key = (a.worker_id, a.date.isoformat(), a.shift_id)
        if key in seen:
            continue
        shift = shift_map.get(a.shift_id)
        if shift is None:
            continue
        iv = build_shift_interval_var(
            worker_id=a.worker_id,
            current_date=a.date,
            shift=shift,
            shifts=shifts,
            shift_id_to_duration_dict=shift_id_to_duration_dict,
        )
        s_start, s_duration, s_end, _key = iv
        # Include only if the interval end reaches into the campaign period.
        if s_end >= campaign_start_minutes:
            seen.add(key)
            result.append(iv)

    return result


def build_shift_interval_var(
    worker_id: str,
    current_date: date,
    shift: Shift,
    shifts: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
) -> tuple[int, int, int, tuple[str, str, str]]:
    day_diff_start = 0
    if shift.rest_type == ShiftRestType.RECUPERATION:
        s_duty = next(
            (
                s
                for s in shifts
                if s.shift_type == ShiftType.DUTY and s.id == shift.recuperation_duty_id
            ),
            None,
        )
        if s_duty is None:
            raise ValueError(
                f"Shift {shift.id} is a recuperation shift but the duty "
                + f"shift {shift.recuperation_duty_id} is not found."
            )
        day_diff_start = (s_duty.end_time.date() - s_duty.start_time.date()).days
    s_duration = shift_id_to_duration_dict[shift.id]
    s_start_time = int(
        (
            shift.start_time.replace(
                year=current_date.year,
                month=current_date.month,
                day=current_date.day,
            )
            + timedelta(days=day_diff_start)
        ).timestamp()
        // Constants.NUM_SECONDS_MINUTE
    )
    day_diff_end = (
        shift.end_time.date() - shift.start_time.date()
    ).days + day_diff_start
    s_end_time = int(
        (
            shift.end_time.replace(
                year=current_date.year,
                month=current_date.month,
                day=current_date.day,
            )
            + timedelta(days=day_diff_end)
        ).timestamp()
        // Constants.NUM_SECONDS_MINUTE
        - 1
    )
    return (
        s_start_time,
        s_duration,
        s_end_time,
        (worker_id, current_date.isoformat(), shift.id),
    )
