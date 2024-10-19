from datetime import date
from typing import List, Tuple

from core import Shift, ShiftRestType, ShiftType, Worker


def build_duty_recup_pairs(
    workers_not_deleted: List[Worker],
    dates_campaign: List[date],
    shifts_not_deleted: List[Shift],
) -> List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]:
    out: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]] = []
    for shift in shifts_not_deleted:
        if shift.shift_type == ShiftType.DUTY:
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
                        )
                        for w in workers_not_deleted
                        for d in dates_campaign
                    ]
                )
    return out
