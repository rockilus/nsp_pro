"""
Helper functions for replacement service tests.

This module contains pure utility functions used by replacement service tests
that don't depend on pytest fixtures.
"""

from datetime import date, datetime, timedelta, timezone
from typing import List

from shared.schemas.core import Assignment, AssignmentSource, Worker


# pylint: disable=too-many-arguments
def create_shift_datetime(hour: int, minute: int = 0, days_offset: int = 0) -> datetime:
    """Create a datetime with proper timezone for shift times.

    Args:
        hour: Hour of the day (0-23)
        minute: Minute of the hour (0-59)
        days_offset: Number of days to add (for shifts spanning multiple days)

    Returns:
        A timezone-aware datetime object
    """
    base_date = datetime(2023, 1, 1, hour, minute, tzinfo=timezone.utc)
    return base_date + timedelta(days=days_offset)


def generate_weekdays(start_date: date, end_date: date) -> List[date]:
    """Generate list of weekday dates (Monday-Friday) in range.

    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        List of dates that are weekdays
    """
    weekdays = []
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # 0-4 are Monday-Friday
            weekdays.append(current)
        current += timedelta(days=1)
    return weekdays


def generate_all_days(start_date: date, end_date: date) -> List[date]:
    """Generate list of all dates in range.

    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        List of all dates in range
    """
    all_days = []
    current = start_date
    while current <= end_date:
        all_days.append(current)
        current += timedelta(days=1)
    return all_days


def distribute_assignments_round_robin(
    workers: List[Worker],
    dates: List[date],
    shift_ids: List[str],
    team_id: str,
) -> List[Assignment]:
    """Distribute assignments using round-robin across workers.

    Args:
        workers: List of workers
        shifts: List of all shifts (for validation)
        dates: List of dates to create assignments for
        shift_ids: List of shift IDs to rotate through
        team_id: Team ID

    Returns:
        List of assignments with no overlaps per worker
    """
    assignments = []
    worker_index = 0
    assignment_counter = 0

    for date_obj in dates:
        for shift_id in shift_ids:
            worker = workers[worker_index % len(workers)]
            assignment = Assignment(
                id=f"assignment_{assignment_counter}",
                team_id=team_id,
                schedule_id="schedule_1",
                worker_id=worker.id,
                date=date_obj,
                shift_id=shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            assignments.append(assignment)
            assignment_counter += 1
            worker_index += 1

    return assignments


def generate_duty_assignments(
    workers: List[Worker],
    all_dates: List[date],
    duty_shift_id: str,
    recuperation_shift_id: str,
    team_id: str,
    start_assignment_id: int,
) -> List[Assignment]:
    """Generate daily duty assignments followed by recuperation shifts.

    Each duty is assigned to a different worker, followed by a recuperation
    shift the next day for the same worker.

    Args:
        workers: List of workers
        all_dates: List of all dates (including weekends)
        duty_shift_id: ID of the duty shift
        recuperation_shift_id: ID of the recuperation shift
        team_id: Team ID
        start_assignment_id: Starting ID counter for assignments

    Returns:
        List of duty and recuperation assignments
    """
    assignments = []
    worker_index = 0
    assignment_counter = start_assignment_id

    for date_obj in all_dates:
        worker = workers[worker_index % len(workers)]

        # Duty assignment
        duty_assignment = Assignment(
            id=f"assignment_{assignment_counter}",
            team_id=team_id,
            schedule_id="schedule_1",
            worker_id=worker.id,
            date=date_obj,
            shift_id=duty_shift_id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(duty_assignment)
        assignment_counter += 1

        # Recuperation assignment (next day)
        next_day = date_obj + timedelta(days=1)
        # Only add recuperation if next day is within range
        if next_day <= all_dates[-1]:
            recuperation_assignment = Assignment(
                id=f"assignment_{assignment_counter}",
                team_id=team_id,
                schedule_id="schedule_1",
                worker_id=worker.id,
                date=next_day,
                shift_id=recuperation_shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            assignments.append(recuperation_assignment)
            assignment_counter += 1

        worker_index += 1

    return assignments
