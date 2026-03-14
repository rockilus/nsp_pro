from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from shared.constraint_parser import build_dim_to_attr_value_to_owner
from shared.constraint_parser.parse_selected_shifts import (
    parse_selected_shifts,
)
from shared.schemas.core import (
    Assignment,
    Attribute,
    Dimension,
    DimEntry,
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

from core_to_engine_service.build_scope_context import ScopeContext

# pylint: disable=too-many-arguments, too-many-locals, R0801


def _filter_campaign_dates(
    request: Request,
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
) -> List[date]:
    """
    Filter request dates to only include those in worker's campaign period.

    Args:
        request: The request containing start_date, end_date, and worker_id
        worker_ids_to_worker_dates: Mapping of worker IDs to date ranges

    Returns:
        List of dates in both the request period and campaign period
    """
    # Generate all dates in the request period
    dates_request = [
        request.start_date + timedelta(days=x)
        for x in range((request.end_date - request.start_date).days + 1)
    ]

    # Filter to campaign dates only
    if request.worker_id not in worker_ids_to_worker_dates:
        return []

    return [
        d
        for d in dates_request
        if d in worker_ids_to_worker_dates[request.worker_id].dates_campaign
    ]


def _zero_overlapping_shifts(
    out: Dict[Tuple[str, str, str], int],
    worker_id: str,
    date_iso: str,
    reference_shift: Shift,
    shifts: List[Shift],
    exclude_shift_id: str | None = None,
) -> None:
    """
    Set overlapping normal/duty shifts to 0 for given worker/date.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        worker_id: The worker's ID
        date_iso: The date in ISO format
        reference_shift: The shift to check overlaps against
        shifts: List of all shifts
        exclude_shift_id: Optional shift ID to exclude from zeroing
    """
    for s in shifts:
        if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]:
            if s.id != exclude_shift_id and reference_shift.overlaps_with(s):
                out[worker_id, date_iso, s.id] = 0


def _initialize_historical_assignments(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    assignments: List[Assignment],
) -> Dict[Tuple[str, str, str], int]:
    """
    Initialize fixed values dictionary with historical assignments.

    Creates a dictionary with all worker-date-shift combinations for historical
    dates set to 0, then marks existing assignments as 1.

    Args:
        workers: List of all workers (including deleted)
        worker_ids_to_worker_dates: Mapping of worker IDs to their date ranges
        shifts: List of all shifts
        assignments: List of existing historical assignments

    Returns:
        Dictionary mapping (worker_id, date_iso, shift_id) to 0 or 1
    """
    # Initialize all historical assignments to 0
    out = {
        (w.id, d.isoformat(), s.id): 0
        for w in workers
        for d in worker_ids_to_worker_dates[w.id].dates_hist
        for s in shifts
    }

    # Mark existing assignments as 1
    for a in assignments:
        out[a.worker_id, a.date.isoformat(), a.shift_id] = 1

    return out


def _apply_leave_requests(
    out: Dict[Tuple[str, str, str], int],
    approved_requests: List[Request],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_dict: Dict[str, Shift],
    shifts: List[Shift],
) -> None:
    """
    Apply approved LEAVE requests to fixed values.

    Sets leave shifts to 1 and zeros out overlapping normal/duty shifts.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        approved_requests: List of approved requests to process
        worker_ids_to_worker_dates: Mapping of worker IDs to their date ranges
        shift_dict: Dictionary mapping shift IDs to Shift objects
        shifts: List of all shifts
    """
    for req in approved_requests:
        if req.status != RequestStatus.APPROVED:
            continue
        if req.request_type != RequestType.LEAVE:
            continue

        # Validate shift_id
        if not req.shift_id or req.shift_id not in shift_dict:
            continue

        leave_shift = shift_dict[req.shift_id]
        dates_to_process = _filter_campaign_dates(
            req, worker_ids_to_worker_dates
        )

        for d in dates_to_process:
            date_iso = d.isoformat()

            # Set the leave shift to 1
            out[req.worker_id, date_iso, req.shift_id] = 1

            # Zero out overlapping normal/duty shifts
            _zero_overlapping_shifts(
                out, req.worker_id, date_iso, leave_shift, shifts
            )


def _apply_negative_work_demand(
    out: Dict[Tuple[str, str, str], int],
    req: Request,
    target_shift_ids: List[str],
    dates_to_process: List[date],
) -> None:
    """
    Apply a negative WORK_DEMAND request (worker doesn't want these shifts).

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        req: The request being processed
        target_shift_ids: List of shift IDs the worker doesn't want
        dates_to_process: List of dates to apply the request to
    """
    for d in dates_to_process:
        date_iso = d.isoformat()
        for shift_id in target_shift_ids:
            out[req.worker_id, date_iso, shift_id] = 0


def _apply_single_shift_work_demand(
    out: Dict[Tuple[str, str, str], int],
    req: Request,
    target_shift: Shift,
    target_shift_id: str,
    dates_to_process: List[date],
    shifts: List[Shift],
) -> None:
    """
    Apply a positive single-shift WORK_DEMAND request.

    Sets the requested shift to 1 and zeros out overlapping normal/duty shifts.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        req: The request being processed
        target_shift: The Shift object the worker wants
        target_shift_id: The shift ID
        dates_to_process: List of dates to apply the request to
        shifts: List of all shifts
    """
    for d in dates_to_process:
        date_iso = d.isoformat()

        # Set the requested shift to 1
        out[req.worker_id, date_iso, target_shift_id] = 1

        # Zero out overlapping normal/duty shifts (excluding target)
        _zero_overlapping_shifts(
            out, req.worker_id, date_iso, target_shift, shifts, target_shift_id
        )


def _apply_multi_shift_work_demand(
    out: Dict[Tuple[str, str, str], int],
    req: Request,
    target_shifts: List[Shift],
    dates_to_process: List[date],
    shifts: List[Shift],
) -> None:
    """
    Apply a positive multi-shift WORK_DEMAND request.

    Zeros out overlapping normal/duty shifts for each target shift.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        req: The request being processed
        target_shifts: List of Shift objects the worker wants
        dates_to_process: List of dates to apply the request to
        shifts: List of all shifts
    """
    for d in dates_to_process:
        date_iso = d.isoformat()

        # For each target shift, zero out overlapping shifts
        for target_shift in target_shifts:
            _zero_overlapping_shifts(
                out, req.worker_id, date_iso, target_shift, shifts
            )


def _apply_work_demand_requests(
    out: Dict[Tuple[str, str, str], int],
    approved_requests: List[Request],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_dict: Dict[str, Shift],
    shifts: List[Shift],
    dim_to_attr_value_to_shift: Dict[
        str, Dict[str | int | float | bool, List[str]]
    ],
) -> None:
    """
    Apply approved WORK_DEMAND requests to fixed values.

    Handles both positive and negative requests, single and multi-shift cases.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        approved_requests: List of approved requests to process
        worker_ids_to_worker_dates: Mapping of worker IDs to their date ranges
        shift_dict: Dictionary mapping shift IDs to Shift objects
        shifts: List of all shifts
        dim_to_attr_value_to_shift: Dimension mapping for parsing shift options
    """
    for req in approved_requests:
        if req.status != RequestStatus.APPROVED:
            continue
        if req.request_type != RequestType.WORK_DEMAND:
            continue

        # Validate shift_options
        if not req.shift_options:
            continue

        # Parse target shift IDs
        try:
            target_shift_ids = parse_selected_shifts(
                selected_shifts=req.shift_options,
                missing_properties=[],
                shifts=shifts,
                shift_dim_dict=dim_to_attr_value_to_shift,
            )
        except (ValueError, KeyError, IndexError):
            continue

        # Filter to valid shift IDs
        target_shift_ids = [
            sid for sid in target_shift_ids if sid in shift_dict
        ]
        if not target_shift_ids:
            continue

        target_shifts = [shift_dict[sid] for sid in target_shift_ids]
        dates_to_process = _filter_campaign_dates(
            req, worker_ids_to_worker_dates
        )

        if req.negative:
            _apply_negative_work_demand(
                out, req, target_shift_ids, dates_to_process
            )
        else:
            # Positive request
            if len(target_shift_ids) == 1:
                _apply_single_shift_work_demand(
                    out,
                    req,
                    target_shifts[0],
                    target_shift_ids[0],
                    dates_to_process,
                    shifts,
                )
            else:
                _apply_multi_shift_work_demand(
                    out, req, target_shifts, dates_to_process, shifts
                )


def _zero_unrequested_leave_shifts(
    out: Dict[Tuple[str, str, str], int],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    requests: List[Request],
) -> None:
    """
    Set leave shifts to 0 when no request exists for that worker/date/shift.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        workers_not_deleted: List of active workers
        worker_ids_to_worker_dates: Mapping of worker IDs to their date ranges
        shifts: List of all shifts
        requests: List of all requests (for checking if leave was requested)
    """
    leave_shifts = [s for s in shifts if s.leave_type != ShiftLeaveType.NONE]

    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            for s in leave_shifts:
                # Check if there's a request for this worker/shift/date
                request = [
                    r
                    for r in requests
                    if r.worker_id == w.id
                    and r.shift_id == s.id
                    and r.start_date <= d <= r.end_date
                ]
                if not request:
                    out[w.id, d.isoformat(), s.id] = 0


def _zero_shifts_without_demand(
    out: Dict[Tuple[str, str, str], int],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    daily_shift_demands: List[ShiftDemandNew],
) -> None:
    """
    Set normal/duty shifts to 0 when no demand exists for that date.

    Args:
        out: The fixed values dictionary to modify (modified in-place)
        workers_not_deleted: List of active workers
        worker_ids_to_worker_dates: Mapping of worker IDs to their date ranges
        shifts: List of all shifts
        daily_shift_demands: List of daily shift demands
    """
    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            # Get shift IDs that have demands on this date
            shifts_in_dsds = [
                dsd.shift_id for dsd in daily_shift_demands if dsd.date == d
            ]

            # Zero out normal/duty shifts without demands
            for s in shifts:
                if (
                    s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
                    and s.id not in shifts_in_dsds
                    and s.deleted is False
                ):
                    out[w.id, d.isoformat(), s.id] = 0


def core_to_engine_fixed_values(
    workers: List[Worker],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    shifts_not_deleted: List[Shift],
    daily_shift_demands: List[ShiftDemandNew],
    assignments: List[Assignment],
    requests: List[Request],
    approved_requests: List[Request],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    var_model: List[Tuple[str, str, str]],
    scope_ctx: Optional[ScopeContext] = None,
) -> Dict[Tuple[str, str, str], int]:
    """
    Build fixed values dictionary for the solver.

    Fixed values constrain the solver by marking certain worker-shift-date
    combinations as required (1) or forbidden (0).

    Process:
    1. Initialize with historical assignments
    2. Apply approved LEAVE requests
    3. Apply approved WORK_DEMAND requests
    4. Zero out unrequested leave shifts
    5. Zero out shifts without demand

    Args:
        workers: All workers (including deleted)
        workers_not_deleted: Active workers only
        worker_ids_to_worker_dates: Mapping of worker IDs to date ranges
        shifts: All shifts
        daily_shift_demands: Daily shift demand records
        assignments: Existing historical assignments
        requests: All requests (for checking leave requests)
        approved_requests: Approved requests to process
        dimensions: Dimensions for parsing shift options
        dim_entries: Dimension entries for parsing
        attributes: Attributes for parsing

    Returns:
        Dictionary mapping (worker_id, date_iso, shift_id) to 0 or 1
    """
    # Initialize with historical assignments
    out = _initialize_historical_assignments(
        workers, worker_ids_to_worker_dates, shifts, assignments
    )

    # Build shared context for request processing
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        shifts_not_deleted, dimensions, dim_entries, attributes
    )
    shift_dict = {s.id: s for s in shifts}

    # Apply approved requests
    _apply_leave_requests(
        out,
        approved_requests,
        worker_ids_to_worker_dates,
        shift_dict,
        shifts_not_deleted,
    )
    _apply_work_demand_requests(
        out,
        approved_requests,
        worker_ids_to_worker_dates,
        shift_dict,
        shifts_not_deleted,
        dim_to_attr_value_to_shift,
    )

    # Cleanup: zero out unrequested leaves and shifts without demand
    _zero_unrequested_leave_shifts(
        out,
        workers_not_deleted,
        worker_ids_to_worker_dates,
        shifts_not_deleted,
        requests,
    )
    _zero_shifts_without_demand(
        out,
        workers_not_deleted,
        worker_ids_to_worker_dates,
        shifts_not_deleted,
        daily_shift_demands,
    )

    # If a scope context is provided, fix all variables outside of the
    # scope to 0 (but don't override already-fixed values).
    if scope_ctx is not None:
        model_vars = set(var_model)
        outside_vars = model_vars - scope_ctx.variables
        for var in outside_vars:
            if var not in out:
                if var == (
                    "69afd80dd2d7e03a80eb6633",
                    "2026-04-09",
                    "69afd80dd2d7e03a80eb663e",
                ):
                    print("Debug: Fixing variable outside scope:", var)
                out[var] = 0
    # Ensure all returned fixed variables actually exist in the model
    # (drop any keys not present in var_model).
    var_model_set = set(var_model)
    out = {k: v for k, v in out.items() if k in var_model_set}
    return out
