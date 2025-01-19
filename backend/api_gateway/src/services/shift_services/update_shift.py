from typing import Dict, List, Tuple

from shared.schemas import LinkShift, Shift, ShiftLeaveType, ShiftRestType

from scripts.setup_database import shift_db
from services.link_shift_services.update_link_shift import (
    update_link_shift_upon_shift_update,
)
from services.worker_services.update_worker import generate_acronym


def update_shift(
    shift_updated: Shift,
) -> Tuple[Shift, Dict[str, List[LinkShift | str]] | None]:
    shift_existing = shift_db.get_shift_by_id(shift_updated.id)
    if shift_existing is None:
        raise ValueError("Shift does not exist")
    if shift_existing.rest_type == ShiftRestType.OFF:
        raise ValueError("Cannot update the default rest shift")
    if shift_existing.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot update a leave shift")
    if shift_updated.acronym != shift_existing.acronym:
        shift_updated.acronym_custom = True
    if shift_updated.name != shift_existing.name and not shift_updated.acronym_custom:
        shifts = shift_db.get_shifts_not_deleted(shift_updated.team_id)
        acronyms = [s.acronym for s in shifts if s.id != shift_updated.id]
        shift_updated.acronym = generate_acronym(shift_updated.name, acronyms)
    shift_saved = shift_db.update_shift(shift_updated)
    ls_change = None
    if (
        shift_saved.start_time != shift_existing.start_time
        or shift_saved.end_time != shift_existing.end_time
    ):
        ls_change = update_link_shift_upon_shift_update(shift_saved)
    return shift_saved, ls_change
