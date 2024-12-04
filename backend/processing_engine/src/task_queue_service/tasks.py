import time  # For simulation purposes

from task_queue_service.celery_app import app


@app.task(bind=True)
def process_data(user_id):
    # Simulate processing time
    time.sleep(5)
    # Process the data (implement your solver algorithm here)
    processed_data = {
        "user_id": user_id,
        "result": f"Processed data for {user_id}",
    }
    # Optionally, send the processed data to the storage service
    # save_result.delay(processed_data)
    return processed_data
