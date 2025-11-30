from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from shared.constraint_parser import build_dim_to_attr_value_to_owner
from shared.constraint_parser.parse_selected_shifts import (
    parse_selected_shifts,
)
from shared.schemas.core import (
    Assignment,
    Attribute,
    DimEntry,
    Dimension,
    Request,
    RequestStatus,
    RequestType,
    Shift,
    ShiftDemandNew,
    ShiftLeaveType,
    ShiftType,
    Worker,
    WorkerDates,
)


def _shifts_overlap(shift1: Shift, shift2: Shift) -> bool:
    """Check if two shifts have overlapping time periods."""
    date_ref = datetime.now(timezone.utc).date()

    s1_diff_days = (shift1.end_time - shift1.start_time).days
    s1_start = datetime.combine(date_ref, shift1.start_time.time())
    s1_end = datetime.combine(date_ref, shift1.end_time.time()) + timedelta(
        days=s1_diff_days
    )

    s2_diff_days = (shift2.end_time - shift2.start_time).days
    s2_start = datetime.combine(date_ref, shift2.start_time.time())
    s2_end = datetime.combine(date_ref, shift2.end_time.time()) + timedelta(
        days=s2_diff_days
    )

    return s1_start < s2_end and s1_end > s2_start


# pylint: disable=too-many-arguments, R0801, too-many-locals, too-many-branches
# pylint: disable=too-many-statements, too-many-nested-blocks
def core_to_engine_fixed_values(
    workers: List[Worker],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    daily_shift_demands: List[ShiftDemandNew],
    assignments: List[Assignment],
    requests: List[Request],
    approved_requests: List[Request],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> Dict[Tuple[str, str, str], int]:
    # Assignments before campaign
    out = {
        (w.id, d.isoformat(), s.id): 0
        for w in workers
        for d in worker_ids_to_worker_dates[w.id].dates_hist
        for s in shifts
    }
    for a in assignments:
        out[
            a.worker_id,
            a.date.isoformat(),
            a.shift_id,
        ] = 1

    # Build dimension to attribute mapping for parse_selected_shifts
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        shifts,
        dimensions,
        dim_entries,
        attributes,
    )

    # Create a shift lookup dictionary
    shift_dict = {s.id: s for s in shifts}

    # Handle APPROVED requests
    for req in approved_requests:
        if req.status != RequestStatus.APPROVED:
            continue

        # Generate dates for the request period
        dates_request = [
            req.start_date + timedelta(days=x)
            for x in range((req.end_date - req.start_date).days + 1)
        ]

        # Filter dates that are in the worker's campaign dates
        if req.worker_id not in worker_ids_to_worker_dates:
            continue

        dates_to_process = [
            d
            for d in dates_request
            if d in worker_ids_to_worker_dates[req.worker_id].dates_campaign
        ]

        if req.request_type == RequestType.LEAVE:
            # LEAVE request: shift_id should be set
            if not req.shift_id or req.shift_id not in shift_dict:
                continue

            leave_shift = shift_dict[req.shift_id]

            for d in dates_to_process:
                date_iso = d.isoformat()

                # Set the leave shift to 1
                if (req.worker_id, date_iso, req.shift_id) in out:
                    out[req.worker_id, date_iso, req.shift_id] = 1

                # Set overlapping normal/duty shifts to 0
                for s in shifts:
                    if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]:
                        if _shifts_overlap(leave_shift, s):
                            if (req.worker_id, date_iso, s.id) in out:
                                out[req.worker_id, date_iso, s.id] = 0

        elif req.request_type == RequestType.WORK_DEMAND:
            # WORK_DEMAND request: use shift_options
            if not req.shift_options:
                continue

            # Get target shift IDs using parse_selected_shifts
            try:
                target_shift_ids = parse_selected_shifts(
                    selected_shifts=req.shift_options,
                    missing_properties=[],
                    shifts=shifts,
                    shift_dim_dict=dim_to_attr_value_to_shift,
                )
            except (ValueError, KeyError, IndexError):
                # If parsing fails, skip this request
                continue

            # Filter to valid shift IDs
            target_shift_ids = [
                sid for sid in target_shift_ids if sid in shift_dict
            ]
            if not target_shift_ids:
                continue

            target_shifts = [shift_dict[sid] for sid in target_shift_ids]

            if req.negative:
                # Negative request: set requested shifts to 0
                for d in dates_to_process:
                    date_iso = d.isoformat()
                    for shift_id in target_shift_ids:
                        if (req.worker_id, date_iso, shift_id) in out:
                            out[req.worker_id, date_iso, shift_id] = 0

            else:
                # Positive request
                if len(target_shift_ids) == 1:
                    # Single shift: set it to 1 and overlapping shifts to 0
                    target_shift = target_shifts[0]
                    target_shift_id = target_shift_ids[0]

                    for d in dates_to_process:
                        date_iso = d.isoformat()

                        # Set the requested shift to 1
                        if (req.worker_id, date_iso, target_shift_id) in out:
                            out[req.worker_id, date_iso, target_shift_id] = 1

                        # Set overlapping normal/duty shifts to 0
                        for s in shifts:
                            if s.shift_type in [
                                ShiftType.NORMAL,
                                ShiftType.DUTY,
                            ]:
                                if _shifts_overlap(target_shift, s):
                                    if (req.worker_id, date_iso, s.id) in out:
                                        out[req.worker_id, date_iso, s.id] = 0

                else:
                    # Multiple shifts: set overlapping normal/duty shifts to 0
                    for d in dates_to_process:
                        date_iso = d.isoformat()

                        # For each target shift, find and zero overlapping
                        for target_shift in target_shifts:
                            for s in shifts:
                                if s.shift_type in [
                                    ShiftType.NORMAL,
                                    ShiftType.DUTY,
                                ]:
                                    if _shifts_overlap(target_shift, s):
                                        key = (req.worker_id, date_iso, s.id)
                                        if key in out:
                                            out[key] = 0

    # Leave shifts not requested:
    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            leave_shifts = [
                s for s in shifts if s.leave_type != ShiftLeaveType.NONE
            ]
            for s in leave_shifts:
                request = [
                    r
                    for r in requests
                    if r.worker_id == w.id
                    and r.shift_id == s.id
                    and r.start_date <= d <= r.end_date
                ]
                if not request:
                    out[w.id, d.isoformat(), s.id] = 0
    # Normal and duty shifts without daily shift demands
    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            shifts_in_dsds = [
                dsd.shift_id for dsd in daily_shift_demands if dsd.date == d
            ]
            for s in [
                s
                for s in shifts
                if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
                and s.id not in shifts_in_dsds
                and s.deleted is False
            ]:
                if (w.id, d.isoformat(), s.id) not in out:
                    out[w.id, d.isoformat(), s.id] = 0
    return out
