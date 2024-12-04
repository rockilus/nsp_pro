from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    DimensionEntryType,
    DimensionType,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
)

from scripts.setup_database import attribute_db, dimension_db, shift_db


def create_shift(shift: Shift) -> Tuple[Shift, List[Attribute]]:
    if shift.rest_type == ShiftRestType.OFF:
        raise ValueError("Cannot create the default rest shift")
    if shift.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot create a leave shift")
    shift_created = shift_db.create_shift(shift)
    dim_types = (
        [DimensionType.SHIFT]
        if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        else [DimensionType.REST_SHIFT]
    )
    d_bool = dimension_db.get_dimensions_by_dim_types_and_entry_type(
        dim_types,
        DimensionEntryType.BOOL,
        shift_created.team_id,
    )
    attributes: List[Attribute] = []
    attributes_saved: List[Attribute] = []
    for d in d_bool:
        attributes.append(
            Attribute(
                id="",
                value=False,
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=shift_created.id,
                dimension_id=d.id,
                dim_entry_ids=[],
            )
        )
    attributes_saved = attribute_db.create_attributes(attributes)
    return shift_created, attributes_saved


def create_duty_recuperation_shifts(
    shifts: List[Shift],
) -> List[Shift]:
    drs_new = []
    drs_updated = []
    drs_deleted = []
    for shift in [s for s in shifts if not s.deleted]:
        dr_existing = next(
            (
                s
                for s in shifts
                if s.shift_type == ShiftType.REST
                and s.rest_type == ShiftRestType.RECUPERATION
                and s.recuperation_duty_id == shift.id
            ),
            None,
        )
        dr_start_time = shift.end_time
        dr_end_time = dr_start_time + timedelta(hours=shift.recuperation_time)
        if dr_existing:
            if shift.shift_type != ShiftType.DUTY:
                if not dr_existing.deleted:
                    drs_deleted.append(shift_db.logical_delete_shift(dr_existing.id))
                continue
            if (
                dr_existing.start_time == dr_start_time
                and dr_existing.end_time == dr_end_time
                and not dr_existing.deleted
            ):
                continue
            dr_existing.start_time = dr_start_time
            dr_existing.end_time = dr_end_time
            dr_existing.deleted = False
            drs_updated.append(dr_existing)
            continue
        if shift.shift_type != ShiftType.DUTY:
            continue
        dr = Shift(
            id="",
            team_id=shift.team_id,
            name="Duty recuperation",
            start_time=dr_start_time,
            end_time=dr_end_time,
            staffing=[],
            color="#EDBB99",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=shift.id,
            deleted=False,
        )
        drs_new.append(dr)
    return (
        shift_db.create_shifts(drs_new)
        + shift_db.update_shifts(drs_updated)
        + drs_deleted
    )


def create_default_shifts(team_id: str) -> None:
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
    rest_shifts = [
        Shift(
            id="",
            team_id=team_id,
            name="Off",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.OFF,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]
    leave_shifts = [
        Shift(
            id="",
            team_id=team_id,
            name="Vacation",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Vacation morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Vacation afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Sick leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.SICK,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="2",
            team_id=team_id,
            name="Sick leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.SICK_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Sick leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.SICK_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.UNPAID,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.UNPAID_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Unpaid leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.UNPAID_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.PARENTAL_LEAVE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.PARENTAL_LEAVE_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Parental leave",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.PARENTAL_LEAVE_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.TRAINING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave morning",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.TRAINING_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Training leave afternoon",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.TRAINING_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_start,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.OTHER,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_start,
            end_time=reference_date_midday,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.OTHER_MORNING,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="",
            team_id=team_id,
            name="Other",
            start_time=reference_date_midday,
            end_time=reference_date_end,
            staffing=[],
            color="grey",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.OTHER_AFTERNOON,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]
    shift_db.create_shifts(rest_shifts + leave_shifts)
