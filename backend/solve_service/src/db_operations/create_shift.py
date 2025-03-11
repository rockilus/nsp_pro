from datetime import datetime, timedelta, timezone
from typing import List

from shared.database import DatabaseCollections
from shared.schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType


def create_duty_recuperation_shifts(
    shifts: List[Shift], collections: DatabaseCollections
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
        dr_start_time = datetime(
            shift.start_time.year,
            shift.start_time.month,
            shift.start_time.day,
            shift.end_time.hour,
            shift.end_time.minute,
            tzinfo=timezone.utc,
        )
        dr_end_time = dr_start_time + timedelta(hours=shift.recuperation_time)
        if dr_existing:
            if shift.shift_type != ShiftType.DUTY:
                if not dr_existing.deleted:
                    drs_deleted.append(
                        collections.shift_db.logical_delete_shift(dr_existing.id)
                    )
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
            acronym="DR",
            acronym_custom=False,
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
        collections.shift_db.create_shifts(drs_new)
        + collections.shift_db.update_shifts(drs_updated)
        + drs_deleted
    )
