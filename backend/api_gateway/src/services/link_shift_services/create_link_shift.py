from shared.schemas import LinkShift

from scripts.setup_database import link_shift_db, shift_db
from services.link_shift_services.validate_link_shift import validate_link_shift


def create_link_shift(link_shift: LinkShift) -> LinkShift:
    shifts = shift_db.get_shifts_by_ids(link_shift.shift_ids)
    link_shifts = link_shift_db.get_link_shifts(link_shift.team_id)
    valid = validate_link_shift(link_shift, shifts, link_shifts)
    if valid:
        return link_shift_db.create_link_shift(link_shift)
    raise ValueError("LinkShift is not valid.")
