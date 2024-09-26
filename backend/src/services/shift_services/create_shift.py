from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from core import Shift, ShiftLeaveType, ShiftProperty
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db


def create_shift(shift: Shift) -> Tuple[Shift, List[ShiftProperty]]:
    if shift.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot create a leave shift")
    shift_created = shift_db.create_shift(shift)
    sd_bool = shift_dimension_db.get_shift_dimensions_by_entry_type(
        "bool", shift_created.team_id
    )
    sp_bool = []
    for wd in sd_bool:
        sp_bool.append(
            shift_property_db.create_shift_property(
                ShiftProperty(
                    id="",
                    value=False,
                    shift_id=shift_created.id,
                    shift_dimension_id=wd.id,
                )
            )
        )
    return shift_created, sp_bool


def create_default_leave_shifts(team_id: str) -> None:
    reference_date = datetime.now(timezone.utc)
    reference_date_start = reference_date.replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    reference_date_end = (reference_date + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    reference_date_midday = reference_date.replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    leave_shifts = [
        Shift(
            id="",
            team_id=team_id,
            name="Vacation",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.VACATION,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Vacation morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.VACATION_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Vacation afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.VACATION_AFTERNOON,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Sick leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.SICK,
            deleted=False,
        ),
        Shift(
            id="2",
            team_id=team_id,
            name="Sick leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.SICK_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Sick leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.SICK_AFTERNOON,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.UNPAID,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.UNPAID_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.UNPAID_AFTERNOON,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.PARENTAL_LEAVE,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.PARENTAL_LEAVE_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.PARENTAL_LEAVE_AFTERNOON,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.TRAINING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.TRAINING_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.TRAINING_AFTERNOON,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.OTHER,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.OTHER_MORNING,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=0,
            is_time_off=True,
            color="grey",
            leave_type=ShiftLeaveType.OTHER_AFTERNOON,
            deleted=False,
        ),
    ]
    for leave_shift in leave_shifts:
        shift_db.create_shift(leave_shift)
