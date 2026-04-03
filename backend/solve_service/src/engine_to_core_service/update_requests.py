from datetime import timedelta

from shared.schemas.core import Assignment, Request, RequestStatus


def update_requests_and_build_request_breaches(
    assignments: list[Assignment], requests: list[Request]
) -> list[Request]:
    out: list[Request] = []
    for r in requests:
        dates = [
            r.start_date + timedelta(days=i)
            for i in range((r.end_date - r.start_date).days + 1)
        ]
        a_filtered = [
            a
            for a in assignments
            if a.worker_id == r.worker_id
            and a.date in dates
            and a.shift_id == r.shift_id
        ]
        if r.negative:
            if len(a_filtered) > 0:
                r.status = RequestStatus.DENIED
            else:
                r.status = RequestStatus.APPROVED
        elif len(a_filtered) < len(dates):
            r.status = RequestStatus.DENIED
        else:
            r.status = RequestStatus.APPROVED
        out.append(r)
    return out
