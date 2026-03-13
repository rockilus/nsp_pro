from datetime import timedelta
from typing import List, Tuple

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    Schedule,
    Shift,
    ShiftRestType,
)


# pylint: disable=too-many-locals, too-many-statements
def get_wip_assignments(
    schedule: Schedule, collections: DatabaseCollections
) -> List[Assignment]:
    return collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        fixed=False,
    )


def get_fixed_assignments(
    schedule: Schedule, collections: DatabaseCollections
) -> Tuple[List[Assignment], List[Assignment]]:
    as_hist = collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=None,
        end_date=schedule.start_date - timedelta(days=1),
    )  # validated assignments
    as_campaign_fixed = collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        fixed=True,
    )  # assignments wip and fixed
    return as_hist, as_campaign_fixed


def save_assignments(
    assignments: List[Assignment],
    schedule: Schedule,
    shifts: List[Shift],
    collections: DatabaseCollections,
) -> List[Assignment]:
    collections.assignment_db.delete_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        delete_fixed=False,
    )
    fixed_assignment_existing = collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        fixed=True,
    )
    if not assignments:
        return []

    shift_map = {shift.id: shift for shift in shifts}

    # Avoid creating assignments that already exist in the DB as fixed
    existing_fixed_keys = set()
    if fixed_assignment_existing:
        tmp = []
        for fa in fixed_assignment_existing:
            tmp.append((fa.worker_id, fa.date, fa.shift_id))
        existing_fixed_keys = set(tmp)

    # Also deduplicate incoming assignments (keep first occurrence)
    seen = set()
    filtered_assignments: List[Assignment] = []
    for a in assignments:
        key = (a.worker_id, a.date, a.shift_id)
        if key in existing_fixed_keys:
            # Skip creating this assignment, it already exists as fixed in DB
            continue
        if key in seen:
            # Skip duplicate in the provided assignments list
            continue
        seen.add(key)
        filtered_assignments.append(a)

    assignments = filtered_assignments

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
                # First try to find the newly-created reference assignment
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

                # If not found among newly-created, check fixed assignments
                if not reference_assignment and fixed_assignment_existing:
                    reference_assignment = next(
                        (
                            a
                            for a in fixed_assignment_existing
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
    out = (
        created_non_recuperation_assignments
        + created_recuperation_assignments
        + fixed_assignment_existing
    )
    return out
