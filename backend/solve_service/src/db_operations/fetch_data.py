from datetime import UTC, datetime, timedelta

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Attribute,
    Dimension,
    DimEntry,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Specialty,
    Worker,
)


def fetch_workers_shifts_dim_attributes_spe(
    team_id: str, collections: DatabaseCollections
) -> tuple[
    list[Worker],
    list[Shift],
    list[Dimension],
    list[DimEntry],
    list[Attribute],
    list[Specialty],
]:
    workers = collections.worker_db.get_workers(team_id)
    shifts = collections.shift_db.get_shifts(team_id)
    # Ensure each DUTY shift has a matching non-deleted recuperation shift

    def _ensure_recuperation_for_duty(duty: Shift) -> None:
        if duty.shift_type != ShiftType.DUTY:
            return

        rec = collections.shift_db.get_recuperation_shift(duty.id)
        desired_start = datetime(
            duty.start_time.year,
            duty.start_time.month,
            duty.start_time.day,
            duty.end_time.hour,
            duty.end_time.minute,
            tzinfo=UTC,
        )
        desired_end = desired_start + timedelta(hours=duty.recuperation_time)

        if not rec:
            # create new recuperation shift
            new_shift = Shift(
                id="",
                team_id=duty.team_id,
                name=f"{duty.name} - Recuperation",
                acronym=f"R-{duty.acronym}" if duty.acronym else "",
                acronym_custom=False,
                start_time=desired_start,
                end_time=desired_end,
                staffing=[],
                color=duty.color,
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=duty.recuperation_time,
                recuperation_duty_id=duty.id,
                deleted=False,
            )
            created = collections.shift_db.create_shift(new_shift)
            shifts.append(created)
            return

        # If recuperation exists but is deleted or has wrong times, update it
        needs_update = (
            rec.deleted
            or rec.start_time != desired_start
            or rec.end_time != desired_end
        )
        if needs_update:
            rec.start_time = desired_start
            rec.end_time = desired_end
            rec.deleted = False
            rec.name = f"{duty.name} - Recuperation"
            rec.acronym = f"R-{duty.acronym}" if duty.acronym else rec.acronym
            rec.color = duty.color
            updated = collections.shift_db.update_shift(rec)
            # replace in shifts list if present, otherwise append
            for i, s in enumerate(shifts):
                if s.id == updated.id:
                    shifts[i] = updated
                    break
            else:
                shifts.append(updated)

    # Run the recuperation ensure step for all duty shifts
    for s in list(shifts):
        _ensure_recuperation_for_duty(s)
    dimensions = collections.dimension_db.get_dimensions(team_id)
    dim_entries = collections.dim_entry_db.get_dim_entries_by_dim_ids(
        [d.id for d in dimensions]
    )
    attributes = collections.attribute_db.get_attributes_by_owner_ids(
        [s.id for s in shifts] + [w.id for w in workers]
    )
    specialties = collections.specialty_db.get_specialties_by_team_id(team_id)
    return workers, shifts, dimensions, dim_entries, attributes, specialties
