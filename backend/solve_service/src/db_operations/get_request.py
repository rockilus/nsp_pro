from datetime import date, timedelta
from typing import Callable, List, Optional, Tuple, Dict

from shared.augment import r_to_r_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    Dimension,
    DimEntry,
    FulfillmentStatus,
    Request,
    RequestAugmented,
    RequestStatus,
    RequestType,
    Shift,
    Worker,
)
from shared.schemas.core.constraint import SWOIdTypes
from engine import ProcessingCache


# pylint: disable=too-many-branches
def _sync_assignments_with_requests(
    requests: List[Request], collections: DatabaseCollections
) -> None:
    """Ensure assignments mirror request approval status.

        - For approved single-shift requests: create missing assignments
            (from today onward) or update existing ones so their
            source/source_id point to the request.
    - For non-approved requests: delete assignments created for that request.
    """
    ab = collections.assignment_db
    for req in requests:
        shift_opts = req.shift_options
        single_shift_request = False
        if req.request_type == RequestType.LEAVE:
            if req.shift_id is not None:
                single_shift_request = True
        elif req.request_type == RequestType.WORK_DEMAND:
            if len(shift_opts) == 1:
                first = shift_opts[0]
                if first is not None and first.id_type == SWOIdTypes.SHIFT:
                    single_shift_request = True

        if req.status == RequestStatus.APPROVED and single_shift_request:
            if req.request_type == RequestType.LEAVE:
                if req.shift_id is not None:
                    target_shift_id = req.shift_id
                else:
                    continue  # safety check
            else:
                target_shift_id = req.shift_options[0].id

            get_ass = ab.get_assignment_by_worker_shift_team_and_date
            for i in range((req.end_date - req.start_date).days + 1):
                a_date = req.start_date + timedelta(days=i)
                assignment_existing = get_ass(
                    worker_id=req.worker_id,
                    shift_id=target_shift_id,
                    team_id=req.team_id,
                    a_date=a_date,
                )
                if assignment_existing:
                    if (
                        assignment_existing.source
                        != AssignmentSource.RECURRENCE
                    ):
                        assignment_existing.source = AssignmentSource.REQUEST
                        assignment_existing.source_id = req.id
                    assignment_existing.fixed = True
                    ab.update_assignment(assignment_existing)
                else:
                    assignment_new = Assignment(
                        id="",
                        team_id=req.team_id,
                        schedule_id=None,
                        worker_id=req.worker_id,
                        date=a_date,
                        shift_id=target_shift_id,
                        fixed=True,
                        source=AssignmentSource.REQUEST,
                        source_id=req.id,
                        reference_assignment_id=None,
                    )
                    ab.create_assignment(assignment_new)
        else:
            if req.status != RequestStatus.APPROVED:
                ab.delete_assignments_by_source_id(source_id=req.id)


# pylint: disable=too-many-arguments, too-many-positional-arguments
def get_requests_by_dates(
    start_date: date,
    end_date: date,
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    collections: DatabaseCollections,
) -> Tuple[List[RequestAugmented], List[Request]]:
    requests = collections.request_db.get_requests_by_dates(
        start_date=start_date,
        end_date=end_date,
        worker_ids=[w.id for w in workers],
    )
    requests_work = [
        r
        for r in requests
        if r.request_type == RequestType.WORK_DEMAND
        and r.status == RequestStatus.APPROVED
    ]
    r_work_augmented: List[RequestAugmented] = []
    for r in requests_work:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        r_augmented = r_to_r_augmented(
            request=r,
            worker=worker,
            shifts=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
        )
        if r_augmented.active:
            r_work_augmented.append(r_augmented)
    # Keep assignment synchronization logic in a helper for readability
    _sync_assignments_with_requests(requests=requests, collections=collections)
    requests_leave = [
        r
        for r in requests
        if r.request_type == RequestType.LEAVE
        and r.status == RequestStatus.APPROVED
    ]
    return r_work_augmented, requests_leave


def update_requests(
    requests: List[Request],
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dim_to_attr_value_to_shift: Dict[
        str, Dict[str | int | float | bool, List[str]]
    ],
    collections: DatabaseCollections,
) -> List[RequestAugmented]:
    """Update requests and evaluate fulfillment for single-shift requests.

    Persist fulfillment status and return the augmented requests.

    The actual fulfillment checking logic is delegated to
    `evaluate_single_shift_request_fulfillment` which accepts a pure
    assignment-existence callable so it can be unit-tested without DB access.
    """
    updated_requests = collections.request_db.update_requests(requests)

    # Helper that checks the provided assignments list and returns True if
    # an assignment exists for the given worker/shift/team/date.
    def _assignment_exists(
        worker_id: str, shift_id: str, team_id: str, a_date: date
    ) -> bool:
        for a in assignments:
            if (
                a.worker_id == worker_id
                and a.shift_id == shift_id
                and a.team_id == team_id
                and a.date == a_date
            ):
                return True
        return False

    # Evaluate fulfillment for each updated request when applicable
    need_persist = False
    for r in updated_requests:
        result = evaluate_single_shift_request_fulfillment(
            r, _assignment_exists
        )
        if result is not None and r.fulfillment != result:
            r.fulfillment = result
            need_persist = True

    # Persist fulfillment updates if any changed
    if need_persist:
        collections.request_db.update_requests(updated_requests)

    out: List[RequestAugmented] = []
    for r in updated_requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        # r_to_r_augmented expects shifts/dimensions/dim_entries/attributes
        # Provide minimal context (empty lists) when we don't have them here.
        out.append(
            r_to_r_augmented(
                request=r,
                worker=worker,
                shifts=[shift] if shift else [],
                dimensions=[],
                dim_entries=[],
                attributes=[],
            )
        )
    return out


def evaluate_single_shift_request_fulfillment(
    req: Request,
    assignment_exists: Callable[[str, str, str, date], bool],
) -> Optional[FulfillmentStatus]:
    """Evaluate fulfillment for leave or single-shift work requests.

    - If the request is not a single-shift request, returns None.
    - For leave requests: fulfilled if there are NO assignments for the
      requested shift during the request period.
    - For work demand (single shift):
        - positive (negative == False): fulfilled if there is at least one
          assignment for the shift during the period.
        - negative (negative == True): fulfilled if there are NO assignments
          for the shift during the period.

    The `assignment_exists` callable must accept
    (worker_id, shift_id, team_id, a_date) and return a boolean indicating
    if an assignment exists for that day.
    """
    # Determine if this is a single-shift request and get the target shift id
    single_shift_request = False
    target_shift_id: str | None = None

    if req.request_type == RequestType.LEAVE:
        if req.shift_id is not None:
            single_shift_request = True
            target_shift_id = req.shift_id
    elif req.request_type == RequestType.WORK_DEMAND:
        if len(req.shift_options) == 1:
            first = req.shift_options[0]
            # If the ShiftWorkerOption refers to a SHIFT, use its id
            if first is not None and first.id_type == SWOIdTypes.SHIFT:
                single_shift_request = True
                target_shift_id = first.id

    if not single_shift_request or target_shift_id is None:
        return None

    # Case 1: negative work demand -> need no assignments during the period
    if req.request_type == RequestType.WORK_DEMAND and req.negative:
        for i in range((req.end_date - req.start_date).days + 1):
            a_date = req.start_date + timedelta(days=i)
            exists = assignment_exists(
                req.worker_id, target_shift_id, req.team_id, a_date
            )
            if exists:
                return FulfillmentStatus.UNFULFILLED
        return FulfillmentStatus.FULFILLED

    # Case 2: positive demand -> need assignment every day
    if req.request_type == RequestType.LEAVE or (
        req.request_type == RequestType.WORK_DEMAND and not req.negative
    ):
        for i in range((req.end_date - req.start_date).days + 1):
            a_date = req.start_date + timedelta(days=i)
            exists = assignment_exists(
                req.worker_id, target_shift_id, req.team_id, a_date
            )
            if not exists:
                return FulfillmentStatus.UNFULFILLED
        return FulfillmentStatus.FULFILLED

    # Fallback (shouldn't happen for single-shift requests)
    return None
