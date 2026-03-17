from datetime import timedelta
from typing import List, Optional, Tuple

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    Schedule,
    Shift,
    ShiftRestType,
    SolveScope,
    SolveScopeType,
)

from engine import ScopeContext

# pylint: disable=too-many-locals, too-many-statements, too-many-arguments


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


def _delete_wip_in_scope(
    schedule: Schedule,
    collections: DatabaseCollections,
    scope_ctx: Optional[ScopeContext],
    solve_scope: Optional[SolveScope] = None,
) -> None:
    """Delete WIP assignments that fall within the solver's scope."""
    if scope_ctx is None:
        collections.assignment_db.delete_assignments_by_dates(
            team_id=schedule.team_id,
            start_date=schedule.start_date,
            end_date=schedule.end_date,
            delete_fixed=False,
        )
        return
    assignments_campaign_not_fixed = collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        fixed=False,
    )
    scoped_as_ids: List[str] = []
    if solve_scope is not None:
        # Build convenience sets from the full variable triples
        # `variables` contains (worker_id, date_iso, shift_id)
        worker_date_in_scope = {
            (w_id, date_iso) for (w_id, date_iso, _) in scope_ctx.variables
        }
        shift_date_in_scope = {
            (s_id, date_iso) for (_, date_iso, s_id) in scope_ctx.variables
        }

        if solve_scope.solve_view == "worker":
            scoped_as_ids = [
                a.id
                for a in assignments_campaign_not_fixed
                if (a.worker_id, a.date.isoformat()) in worker_date_in_scope
                and a.id is not None
            ]
        elif solve_scope.solve_view == "shift" or solve_scope.scope_type in [
            SolveScopeType.DUTIES,
            SolveScopeType.NON_DUTIES,
        ]:
            scoped_as_ids = [
                a.id
                for a in assignments_campaign_not_fixed
                if (a.shift_id, a.date.isoformat()) in shift_date_in_scope
                and a.id is not None
            ]
    if scoped_as_ids:
        collections.assignment_db.delete_assignments(scoped_as_ids)


def save_assignments(
    assignments: List[Assignment],
    schedule: Schedule,
    shifts: List[Shift],
    collections: DatabaseCollections,
    scope_ctx: Optional[ScopeContext] = None,
    solve_scope: Optional[SolveScope] = None,
) -> List[Assignment]:
    _delete_wip_in_scope(
        schedule=schedule,
        collections=collections,
        scope_ctx=scope_ctx,
        solve_scope=solve_scope,
    )
    as_campaign_existing = collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
    )
    if not assignments:
        return []

    shift_map = {shift.id: shift for shift in shifts}

    # Avoid creating assignments that already exist in the DB as fixed or that
    # are out of scope
    as_campaign_existing_fixed = [a for a in as_campaign_existing if a.fixed]
    as_campaign_existing_out_of_scope = [
        a
        for a in as_campaign_existing
        if scope_ctx is not None
        and (a.worker_id, a.date.isoformat(), a.shift_id) not in scope_ctx.variables
    ]
    not_for_save_existing_keys = set(
        [(a.worker_id, a.date, a.shift_id) for a in as_campaign_existing_fixed]
        + [
            (aoos.worker_id, aoos.date, aoos.shift_id)
            for aoos in as_campaign_existing_out_of_scope
        ]
    )

    # Also deduplicate incoming assignments (keep first occurrence)
    seen = set()
    filtered_assignments: List[Assignment] = []
    for a in assignments:
        key = (a.worker_id, a.date, a.shift_id)
        if key in not_for_save_existing_keys:
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
                if not reference_assignment and as_campaign_existing:
                    reference_assignment = next(
                        (
                            a
                            for a in as_campaign_existing
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
        + as_campaign_existing
    )
    return out
