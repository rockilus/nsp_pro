import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict

from celery.result import AsyncResult  # type: ignore
from fastapi import APIRouter, Depends, Request, Response
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    EngineOutputsAugmented,
    Solution,
    SolveDetailsStatus,
)
from starlette.responses import StreamingResponse

from src.celery_tasks.celery_app import celery_app
from src.config import config
from src.dependencies import get_db_collections, get_schedule_service
from src.services.schedule_service import ScheduleService

# from src.utils import event_manager

router = APIRouter()

celery_to_core_status_dict = {
    "PENDING": SolveDetailsStatus.PENDING,
    "STARTED": SolveDetailsStatus.STARTED,
    "RETRY": SolveDetailsStatus.RETRY,
    "FAILURE": SolveDetailsStatus.FAILURE,
    "SUCCESS": SolveDetailsStatus.SUCCESS,
}


def celery_to_core_status(celery_status: str) -> int | None:
    status = celery_to_core_status_dict.get(celery_status, None)
    return status.value if status else None


# POLLING ARCHITECTURE
# pylint: disable=too-many-statements
@router.get("/sse", response_class=Response)
async def sse(
    request: Request,
    db_collections: DatabaseCollections = Depends(get_db_collections),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> Callable:

    # pylint: disable=too-many-branches
    async def event_stream(task_id: str | None = None, schedule_id: str | None = None):
        previous_status = None
        print("task_id: ", task_id)

        try:
            if task_id and schedule_id:
                # Check the status of the task in Celery
                async_result = AsyncResult(task_id, app=celery_app)
                schedule = db_collections.schedule_db.get_schedule_by_id(schedule_id)
                if schedule.solve_details is None:
                    event = "error"
                    data_no_details = {
                        "task_id": task_id,
                        "status": SolveDetailsStatus.FAILURE.value,
                        "message": "Schedule does not have solve details",
                    }
                    yield f"event: {event}\ndata: {json.dumps(data_no_details)}\n\n"
                # Task status pending, started, or retry
                # Send the status to the client each time it changes

                while not async_result.ready():
                    now = datetime.now(tz=timezone.utc)
                    if (
                        now - schedule.solve_details.updated_at  # type: ignore
                        > timedelta(seconds=config.task_expiration)
                    ):
                        print("Task expired")
                        async_result.revoke()
                        schedule.solve_details.status = (  # type: ignore
                            SolveDetailsStatus.FAILURE
                        )
                        # type: ignore
                        schedule.solve_details.updated_at = now  # type: ignore
                        schedule = db_collections.schedule_db.update_schedule(schedule)
                        event = "error"
                        data_timeout = {
                            "task_id": task_id,
                            "status": SolveDetailsStatus.FAILURE.value,
                            "message": "Task expired",
                        }
                        yield f"event: {event}\ndata: {json.dumps(data_timeout)}\n\n"
                    else:
                        current_status = async_result.status
                        if current_status != previous_status:
                            event = "task_status"
                            data_status: Dict[str, Any] = {
                                "task_id": task_id,
                                "status": celery_to_core_status(current_status),
                                "message": f"Task is {current_status.lower()}",
                            }
                            yield f"event: {event}\ndata: {json.dumps(data_status)}\n\n"
                            previous_status = current_status
                        await asyncio.sleep(1)  # Polling interval
                        async_result = AsyncResult(task_id, app=celery_app)
                        print("async_result status: ", async_result.status)

                # Task status success or failure
                current_status = async_result.status
                event = "output"
                data: Dict[str, Any] = {
                    "task_id": task_id,
                    "status": celery_to_core_status(current_status),
                    "message": f"Task is {current_status.lower()}",
                }

                # Task status failure
                # Update schedule's solve_details for the failure, and send the
                # updated schedule to the client
                if async_result.failed():
                    if schedule_id:
                        schedule = (
                            schedule_service.update_schedule_solve_details_failure(
                                schedule_id=schedule_id,
                                error=str(async_result.result),
                                task_id=task_id,
                            )
                        )
                        data["schedule"] = schedule.to_dto().model_dump()
                    # task_meta = async_result.info
                    # if task_meta and "schedule_id" in task_meta:
                    # schedule_id = task_meta["schedule_id"]
                    data["message"] = "Task failed"
                    data["exception"] = str(async_result.result)

                # Task status success
                # Check if the task result includes the schedule with updated
                # solve_details (i.e. it was saved in the database):
                # - If it does, send the updated schedule to the client
                # - If it doesn't, update the schedule's solve_details for the
                #   success, and send the updated schedule to the client
                elif async_result.successful():
                    if "eo_augmented" in async_result.result:
                        eo_augmented = EngineOutputsAugmented.from_dict(
                            async_result.result["eo_augmented"]
                        )
                        # pylint: disable=R0801
                        solution = Solution(
                            schedule=eo_augmented.schedule,
                            assignments=eo_augmented.assignments,
                            breaches=eo_augmented.breaches,
                            requests=eo_augmented.requests,
                        )
                        data["solution"] = solution.to_dto().model_dump()
                    else:
                        if schedule_id:
                            schedule = (
                                schedule_service.update_schedule_solve_details_success(
                                    schedule_id=schedule_id,
                                    task_id=task_id,
                                    result=async_result.result,
                                )
                            )
                            data["schedule"] = schedule.to_dto().model_dump()
                        data["message"] = "Task succeeded"
                    data["message"] = "Task succeeded"
                yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
                # yield f"data: {json.dumps(data)}\n\n"
                return  # Close the connection after sending the message

            # Task ID is None
            event = "error"
            data = {"message": "No task ID provided"}
            yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
            return  # Close the connection after sending the message

        except Exception as e:
            event = "error"
            data = {"message": "An error occurred", "error": str(e)}
            yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
            return  # Close the connection after sending the message

    task_id = request.query_params.get("task_id")
    schedule_id = request.query_params.get("schedule_id")
    return StreamingResponse(
        event_stream(task_id, schedule_id), media_type="text/event-stream"
    )


# EVENT DRIVEN ARCHITECTURE
# @router.get("/sse", response_class=Response)
# async def sse() -> Callable:

#     async def event_stream():
#         queue = asyncio.Queue()

#         def send_event(data: dict):
#             """Listener function to send events to the queue."""
#             queue.put_nowait(data)

#         # Subscribe to the EventManager
#         event_manager.subscribe(send_event)

#         try:
#             while True:
#                 data = await queue.get()
#                 # yield f"data: {data}\n\n"
#                 yield f"data: {json.dumps(data)}\n\n"

#         finally:
#             # Unsubscribe the listener when the connection is closed
#             event_manager.listeners.remove(send_event)

#     # return Response(event_stream(), media_type="text/event-stream")
#     return StreamingResponse(event_stream(), media_type="text/event-stream")

# *PENDING*

#     The task is waiting for execution.

# *STARTED*

#     The task has been started.

# *RETRY*

#     The task is to be retried, possibly because of failure.

# *FAILURE*

#     The task raised an exception, or has exceeded the retry limit.
#     The :attr:`result` attribute then contains the
#     exception raised by the task.

# *SUCCESS*

#     The task executed successfully.  The :attr:`result` attribute
#     then contains the tasks return value.
