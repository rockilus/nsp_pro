from typing import List, Tuple

from shared.database.database_collections import DatabaseCollections
from shared.schemas import (
    Assignment,
    Schedule,
    ScheduleStatus,
    Shift,
    ShiftRestType,
)


# pylint: disable=too-many-locals, too-many-statements
def get_fixed_assignments(
    schedule: Schedule, collections: DatabaseCollections
) -> Tuple[List[Assignment], List[Assignment]]:
    team_schedules = collections.schedule_db.get_schedules(schedule.team_id)
    as_hist = collections.assignment_db.get_assignments_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.VALIDATED]
    )  # validated assignments
    as_wip_fixed = collections.assignment_db.get_assignments_fixed_by_schedule_ids(
        [s.id for s in team_schedules if s.status == ScheduleStatus.CAMPAIGN]
    )  # assignments wip and fixed
    return as_hist, as_wip_fixed


def save_assignments(
    assignments: List[Assignment],
    schedule: Schedule,
    fixed_assignments: List[Assignment],
    shifts: List[Shift],
    collections: DatabaseCollections,
) -> List[Assignment]:
    collections.assignment_db.delete_assignments_by_schedule_id(schedule.id)
    if not assignments:
        return []

    shift_map = {shift.id: shift for shift in shifts}

    for assignment in assignments:
        for fixed_assignment in fixed_assignments:
            if (
                assignment.date == fixed_assignment.date
                and assignment.shift_id == fixed_assignment.shift_id
                and assignment.worker_id == fixed_assignment.worker_id
            ):
                assignment.fixed = True
                break

    # Separate assignments into non-recuperation and recuperation
    non_recuperation_assignments = [
        assignment
        for assignment in assignments
        if not (
            shift_map.get(assignment.shift_id)
            and shift_map[assignment.shift_id].rest_type == ShiftRestType.RECUPERATION
        )
    ]

    recuperation_assignments = [
        assignment
        for assignment in assignments
        if shift_map.get(assignment.shift_id)
        and shift_map[assignment.shift_id].rest_type == ShiftRestType.RECUPERATION
    ]

    # Create non-recuperation assignments first
    created_non_recuperation_assignments = collections.assignment_db.create_assignments(
        non_recuperation_assignments
    )

    # Process recuperation assignments
    for assignment in recuperation_assignments:
        shift = shift_map.get(assignment.shift_id)
        if shift and shift.rest_type == ShiftRestType.RECUPERATION:
            reference_shift_id = shift.recuperation_duty_id
            if reference_shift_id:
                reference_assignment = next(
                    (
                        a
                        for a in created_non_recuperation_assignments
                        if a.date == assignment.date
                        and a.worker_id == assignment.worker_id
                        and a.shift_id == reference_shift_id
                    ),
                    None,
                )
                if reference_assignment:
                    assignment.reference_assignment_id = reference_assignment.id

    # Create recuperation assignments
    created_recuperation_assignments = collections.assignment_db.create_assignments(
        recuperation_assignments
    )

    # Combine all created assignments
    out = created_non_recuperation_assignments + created_recuperation_assignments
    return out
