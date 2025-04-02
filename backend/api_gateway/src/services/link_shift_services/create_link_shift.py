from shared.schemas import LinkShift

from src.scripts.setup_database import link_shift_db, shift_db


def create_link_shift(link_shift: LinkShift) -> LinkShift:
    shifts = shift_db.get_shifts_by_ids(link_shift.shift_ids)
    link_shifts = link_shift_db.get_link_shifts(link_shift.team_id)
    valid = link_shift.validate(shifts, link_shifts)
    if valid.is_valid:
        return link_shift_db.create_link_shift(link_shift)
    raise ValueError("LinkShift is not valid: " + valid.message)
