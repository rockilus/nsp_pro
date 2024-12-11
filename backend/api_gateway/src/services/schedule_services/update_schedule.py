from datetime import datetime, timezone

from shared.schemas import Schedule, SolveDetails, SolveDetailsStatus

from scripts.setup_database import schedule_db


def update_schedule_solve_details_failure(
    schedule_id: str, error: str, task_id: str
) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.FAILURE,
        updated_at=datetime.now(timezone.utc),
        result={"error": error},
    )
    schedule.solve_details = solve_details
    schedule = schedule_db.update_schedule(schedule)
    return schedule


def update_schedule_solve_details_success(
    schedule_id: str, result: str, task_id: str
) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.SUCCESS,
        updated_at=datetime.now(timezone.utc),
        result={"output": result},
    )
    schedule.solve_details = solve_details
    schedule = schedule_db.update_schedule(schedule)
    return schedule
