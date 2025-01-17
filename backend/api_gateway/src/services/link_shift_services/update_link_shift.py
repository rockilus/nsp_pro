from shared.schemas import LinkShift, Shift

from scripts.setup_database import link_shift_db, shift_db
from services.link_shift_services.validate_link_shift import validate_link_shift


def update_link_shift(link_shift: LinkShift) -> LinkShift:
    shifts = shift_db.get_shifts_by_ids(link_shift.shift_ids)
    link_shifts = link_shift_db.get_link_shifts(link_shift.team_id)
    link_shifts = [ls for ls in link_shifts if ls.id != link_shift.id]
    valid = validate_link_shift(link_shift, shifts, link_shifts)
    if valid:
        return link_shift_db.update_link_shift(link_shift)
    raise ValueError("LinkShift is not valid.")


def update_link_shift_upon_shift_update(shift: Shift) -> None:
    ls_shift = link_shift_db.get_link_shifts_by_shift_id(shift.id)
    shifts_ids = list(set(shift_id for ls in ls_shift for shift_id in ls.shift_ids))
    shifts = shift_db.get_shifts_by_ids(shifts_ids)
    link_shifts = link_shift_db.get_link_shifts(shift.team_id)
    for ls in ls_shift:
        if shift.id in ls.shift_ids:
            ls_others = [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
            valid = validate_link_shift(ls, shifts, ls_others)
            if valid:
                link_shift_db.update_link_shift(ls)
            else:
                link_shift_db.delete_link_shift(ls.id)


def update_link_shift_upon_shift_delete(shift: Shift) -> None:
    ls_shift = link_shift_db.get_link_shifts_by_shift_id(shift.id)
    shifts_ids = list(set(shift_id for ls in ls_shift for shift_id in ls.shift_ids))
    shifts = shift_db.get_shifts_by_ids(shifts_ids)
    link_shifts = link_shift_db.get_link_shifts(shift.team_id)
    for ls in link_shifts:
        ls.shift_ids.remove(shift.id)
    for ls in ls_shift:
        ls_others = [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
        ls.shift_ids.remove(shift.id)
        valid = validate_link_shift(ls, shifts, ls_others)
        if valid:
            link_shift_db.update_link_shift(ls)
        else:
            link_shift_db.delete_link_shift(ls.id)
