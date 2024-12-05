# from typing import Dict

# from celery.result import AsyncResult  # type: ignore
# from redis import Redis

# from task_queue_service.task_sender import send_to_processing_engine

# redis_client = Redis(host="localhost", port=6379, db=0)


# def submit_task(user_id: str, task_data: Dict) -> Dict:
#     # Send task to processing engine queue
#     task = send_to_processing_engine.apply_async(args=(user_id, task_data))
#     # Store task ID and user ID mapping
#     redis_client.hset("user_tasks", user_id, task.id)
#     return {"status": "queued", "task_id": task.id}


# def get_task_status(user_id: str) -> Dict:
#     # Retrieve task ID associated with the user ID
#     task_id = redis_client.hget("user_tasks", user_id)
#     if not task_id:
#         return {"status": "unknown"}

#     # Get task status
#     task = AsyncResult(
#         task_id.decode("utf-8"), app=send_to_processing_engine  # type: ignore
#     )
#     status = task.status

#     # Optionally, retrieve result or track position in queue
#     result = task.result if task.ready() else None
#     # position = get_queue_position(task_id.decode("utf-8"))

#     return {
#         "status": status,
#         # "position_in_queue": position,
#         "result": result,
#     }


# # def get_queue_position(task_id: str) -> int | None:
# #     # This is a simplified way to estimate the position in the queue
# #     # In practice, you might need a more robust solution
# #     inspector = app.control.inspect()
# #     scheduled = inspector.scheduled()
# #     reserved = inspector.reserved()
# #     active = inspector.active()

# #     queue = []
# #     if scheduled:
# #         for worker_tasks in scheduled.values():
# #             queue.extend(worker_tasks)
# #     if reserved:
# #         for worker_tasks in reserved.values():
# #             queue.extend(worker_tasks)

# #     # Find the position of the task in the queue
# #     for index, queued_task in enumerate(queue):
# #         if queued_task["id"] == task_id:
# #             return index + 1  # Position in queue (1-based)
# #     return None
