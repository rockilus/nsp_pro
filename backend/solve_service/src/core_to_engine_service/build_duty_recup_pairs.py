from typing import Dict, List, Tuple, Optional, Set


from shared.schemas.core import (
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
    WorkerDates,
)
from core_to_engine_service.build_scope_context import ScopeContext


def build_duty_recup_pairs(
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    shift_duties_not_deleted: List[Shift],
    penalty: int,
    scope_ctx: Optional[ScopeContext] = None,
    fixed_assignments_set: Optional[Set[Tuple[str, str, str]]] = None,
) -> List[Tuple[Tuple[str, str, str], Tuple[str, str, str], int]]:
    out: List[Tuple[Tuple[str, str, str], Tuple[str, str, str], int]] = []
    for shift in shift_duties_not_deleted:
        # pylint: disable=R0801
        rec_shift = next(
            (
                s
                for s in shifts_not_deleted
                if s.shift_type == ShiftType.REST
                and s.rest_type == ShiftRestType.RECUPERATION
                and s.recuperation_duty_id == shift.id
                and not s.deleted
            ),
            None,
        )
        if rec_shift:
            out.extend(
                [
                    (
                        (w.id, d.isoformat(), shift.id),
                        (w.id, d.isoformat(), rec_shift.id),
                        penalty,
                    )
                    for w in workers_not_deleted
                    for d in worker_ids_to_worker_dates[w.id].dates_campaign
                    if (
                        scope_ctx is None
                        or (w.id, d.isoformat(), shift.id)
                        in scope_ctx.variables
                    )
                    and (
                        fixed_assignments_set is None
                        or (w.id, d.isoformat(), rec_shift.id)
                        not in fixed_assignments_set
                    )
                ]
            )
    return out
