from datetime import datetime, timedelta, timezone
from typing import List

from shared.schemas import LinkShift, Shift


def validate_link_shift(
    ls_candiate: LinkShift, shifts_ls: List[Shift], ls_others: List[LinkShift]
) -> bool:
    if len(ls_candiate.shift_ids) < 2:
        raise ValueError("LinkShift must contain at least two shifts.")
    if len(ls_candiate.shift_ids) != len(set(ls_candiate.shift_ids)):
        raise ValueError("Duplicate shift IDs found in link_shift.shift_ids.")
    if len(shifts_ls) != len(ls_candiate.shift_ids):
        raise ValueError("Shifts not found.")
    overlap = shifts_overlap(shifts_ls)
    if overlap:
        raise ValueError("Shifts overlap.")
    for ls in ls_others:
        if set(ls.shift_ids) == set(ls_candiate.shift_ids):
            raise ValueError("LinkShift already exists.")
    return True


def shifts_overlap(shifts: list[Shift]) -> bool:
    for i, shift1 in enumerate(shifts):
        for shift2 in shifts[i + 1 :]:
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

            if s1_start < s2_end and s1_end > s2_start:
                return True
    return False
