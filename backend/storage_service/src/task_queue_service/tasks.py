from task_queue_service.celery_app import app  # type: ignore


@app.task(bind=True)
def save_result(processed_data):
    # Save the processed data to the database
    user_id = processed_data["user_id"]
    result = processed_data["result"]
    # Implement your database saving logic here
    print(f"Data saved for user {user_id}: {result}")
    return {"status": "success", "user_id": user_id}
