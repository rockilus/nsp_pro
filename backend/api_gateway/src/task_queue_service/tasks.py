from typing import Dict

from task_queue_service.celery_app import app


@app.task(bind=True)
def send_to_processing_engine(self, user_id: str, data: Dict) -> Dict:
    # This task places the request in the queue for the processing engine
    # You can pass required data and user information

    return {"user_id": user_id, "data": data}
