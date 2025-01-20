from typing import List

from shared.database import DatabaseCollections
from shared.schemas import LinkShift, Shift


def get_link_shifts(
    team_id: str, shifts: List[Shift], collections: DatabaseCollections
) -> List[LinkShift]:
    link_shifts = collections.link_shift_db.get_link_shifts(team_id)
    out: List[LinkShift] = []
    for ls in link_shifts:
        shifts_ls = [s for s in shifts if s.id in ls.shift_ids]
        valid = ls.validate(shifts_ls, link_shifts)
        if valid.is_valid:
            out.append(ls)
        else:
            collections.link_shift_db.delete_link_shift(ls.id)
    return out
