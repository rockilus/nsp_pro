from typing import List

from shared.database.database_collections import DatabaseCollections
from shared.schemas import LinkShift, Shift


def get_link_shifts(
    team_id: str, shifts: List[Shift], collections: DatabaseCollections
) -> List[LinkShift]:
    link_shifts = collections.link_shift_db.get_link_shifts(team_id)
    out: List[LinkShift] = []
    for ls in link_shifts:
        shifts_ls = [s for s in shifts if s.id in ls.shift_ids]
        valid = ls.validate(
            shifts_ls, [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
        )
        if valid.is_valid:
            out.append(ls)
    return out
