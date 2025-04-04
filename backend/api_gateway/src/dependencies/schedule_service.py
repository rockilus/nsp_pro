from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.celery_tasks.celery_app import celery_app
from src.celery_tasks.task_sender import submit_solve_problem_task
from src.dependencies.database import get_db_collections
from src.services.schedule_service import ScheduleService


def get_schedule_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ScheduleService:
    return ScheduleService(
        collection=db_collections,
        celery_app=celery_app,
        submit_solve_problem_task=submit_solve_problem_task,
    )
