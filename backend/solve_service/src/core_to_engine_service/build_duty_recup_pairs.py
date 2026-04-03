from shared.schemas.core import (
    Assignment,
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
    WorkerDates,
)

from core_to_engine_service.build_scope_context import ScopeContext

# pylint: disable=too-many-arguments, too-many-locals, too-many-nested-blocks
# pylint: disable=too-many-positional-arguments


def build_duty_recup_pairs(
    workers_not_deleted: list[Worker],
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shifts_not_deleted: list[Shift],
    shift_duties_not_deleted: list[Shift],
    penalty: int,
    scope_ctx: ScopeContext | None = None,
    fixed_assignments: list[Assignment] | None = None,
) -> list[tuple[tuple[str, str, str], tuple[str, str, str], int]]:
    out: list[tuple[tuple[str, str, str], tuple[str, str, str], int]] = []
    # build quick lookup for shift objects by id
    shift_id_to_shift: dict[str, Shift] = {s.id: s for s in shifts_not_deleted}
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
            pairs: list[tuple[tuple[str, str, str], tuple[str, str, str], int]] = []
            for w in workers_not_deleted:
                for d in worker_ids_to_worker_dates[w.id].dates_campaign:
                    # scope check
                    if (
                        scope_ctx is not None
                        and (w.id, d.isoformat(), shift.id) not in scope_ctx.variables
                    ):
                        continue

                    # if there are fixed assignments, check for time overlap
                    skip_due_to_fixed = False
                    if fixed_assignments:
                        for a in fixed_assignments:
                            if a.worker_id != w.id:
                                continue
                            if a.date != d:
                                continue
                            assigned_shift = shift_id_to_shift.get(a.shift_id)
                            if not assigned_shift:
                                # assigned shift not found in current shifts;
                                # skip conservative
                                continue
                            if assigned_shift.overlaps_with(rec_shift):
                                skip_due_to_fixed = True
                                break

                    if skip_due_to_fixed:
                        continue

                    pairs.append(
                        (
                            (w.id, d.isoformat(), shift.id),
                            (w.id, d.isoformat(), rec_shift.id),
                            penalty,
                        )
                    )

            out.extend(pairs)
    return out
