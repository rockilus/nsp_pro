from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import LinkShift, Shift


def get_link_shifts(
    team_id: str, shifts: list[Shift], collections: DatabaseCollections
) -> list[LinkShift]:
    link_shifts = collections.link_shift_db.get_link_shifts(team_id)
    out: list[LinkShift] = []
    for ls in link_shifts:
        shifts_ls = [s for s in shifts if s.id in ls.shift_ids]
        valid = ls.validate(
            shifts_ls, [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
        )
        if valid.is_valid:
            out.append(ls)
    return out
