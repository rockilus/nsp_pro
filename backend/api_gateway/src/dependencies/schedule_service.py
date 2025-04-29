from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.celery_tasks.celery_app import celery_app
from src.celery_tasks.task_sender import submit_solve_problem_task
from src.dependencies.assignment_service import get_assignment_service
from src.dependencies.daily_shift_demand_service import (
    get_daily_shift_demand_service,
)
from src.dependencies.database import get_db_collections
from src.services.assignment_service import AssignmentService
from src.services.daily_shift_demand_service import DailyShiftDemandService
from src.services.schedule_service import ScheduleService


def get_schedule_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    daily_shift_demand_service: DailyShiftDemandService = Depends(
        get_daily_shift_demand_service,
    ),
) -> ScheduleService:
    return ScheduleService(
        collection=db_collections,
        celery_app=celery_app,
        submit_solve_problem_task=submit_solve_problem_task,
        assignment_service=assignment_service,
        daily_shift_demand_service=daily_shift_demand_service,
    )
