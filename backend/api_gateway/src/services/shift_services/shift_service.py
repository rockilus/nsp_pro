from datetime import datetime, timedelta, timezone

from shared.schemas import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
)

from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods, R0801
class ShiftService(BaseService):
    # def __init__(self, collection: DatabaseCollections):
    #     super().__init__(collection)

    def create_or_update_duty_recuperation_shift(
        self,
        shift_duty: Shift,
    ) -> Shift | None:
        if shift_duty.shift_type != ShiftType.DUTY:
            return None
        recup_existing = self.collection.shift_db.get_recuperation_shift(shift_duty.id)
        recup_start_time = datetime(
            shift_duty.start_time.year,
            shift_duty.start_time.month,
            shift_duty.start_time.day,
            shift_duty.end_time.hour,
            shift_duty.end_time.minute,
            tzinfo=timezone.utc,
        )
        recup_end_time = recup_start_time + timedelta(
            hours=shift_duty.recuperation_time
        )
        if recup_existing:
            if (
                recup_existing.start_time == recup_start_time
                and recup_existing.end_time == recup_end_time
                and not recup_existing.deleted
            ):
                return recup_existing
            recup_existing.start_time = recup_start_time
            recup_existing.end_time = recup_end_time
            recup_existing.deleted = False
            return self.collection.shift_db.update_shift(recup_existing)
        recup_new = Shift(
            id="",
            team_id=shift_duty.team_id,
            name="Duty recuperation",
            acronym="DR",
            acronym_custom=False,
            start_time=recup_start_time,
            end_time=recup_end_time,
            staffing=[],
            color="#EDBB99",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=shift_duty.id,
            deleted=False,
        )
        return self.collection.shift_db.create_shift(recup_new)
