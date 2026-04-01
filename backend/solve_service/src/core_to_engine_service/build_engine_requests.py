from datetime import timedelta

from shared.constraint_parser.parse_selected_shifts import (
    parse_selected_shifts,
)
from shared.schemas.core import (
    Penalty,
    RequestAugmented,
    Shift,
    WorkerDates,
)

from engine import Request as RequestEngine


# pylint: disable=too-many-arguments, too-many-positional-arguments
def build_engine_requests(
    worker_not_deleted_ids: list[str],
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shift_not_deleted_ids: list[str],
    shifts: list[Shift],
    dim_to_attr_value_to_shift: dict[str, dict[str | int | float | bool, list[str]]],
    requests: list[RequestAugmented],
    r_penalty: Penalty,
) -> list[RequestEngine]:
    out: list[RequestEngine] = []
    for r in requests:
        dates_request = [
            r.start_date + timedelta(days=x)
            for x in range((r.end_date - r.start_date).days + 1)
        ]
        worker_ok = r.worker_id in worker_not_deleted_ids
        dates_ok = any(
            d in worker_ids_to_worker_dates[r.worker_id].dates_campaign
            for d in dates_request
        )
        shift_ids = parse_selected_shifts(
            selected_shifts=r.shift_options,
            missing_properties=r.missing_attributes,
            shifts=shifts,
            shift_dim_dict=dim_to_attr_value_to_shift,
        )
        shift_ok = all(shift_id in shift_not_deleted_ids for shift_id in shift_ids)
        if not worker_ok or not dates_ok or not shift_ok:
            continue
        out.append(
            RequestEngine(
                id=r.id,
                assignments=[
                    (r.worker_id, d.isoformat(), s_id)
                    for d in dates_request
                    if d in worker_ids_to_worker_dates[r.worker_id].dates_campaign
                    for s_id in shift_ids
                ],
                negative=r.negative,
                hard=r.hard,
                penalty=(r_penalty.hard if r.hard else r_penalty.soft),
            )
        )
    return out
