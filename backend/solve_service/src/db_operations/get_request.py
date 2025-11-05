from datetime import date, timedelta
from typing import List, Tuple

from shared.augment import r_to_r_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    Dimension,
    DimEntry,
    Request,
    RequestAugmented,
    RequestStatus,
    RequestType,
    Shift,
    Worker,
)
from shared.schemas.core.constraint import SWOIdTypes


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
                    continue  # Safety check; should not happen due to validation
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
    collections: DatabaseCollections,
) -> List[RequestAugmented]:
    updated_requests = collections.request_db.update_requests(requests)
    out: List[RequestAugmented] = []
    for r in updated_requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        out.append(r_to_r_augmented(r, worker, shift))
    return out
