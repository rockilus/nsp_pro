from app import celery_app


@celery_app.task(name="processing_engine.solve_problem")
def solve_problem(data: dict) -> dict:
    """
    A sample task to solve a computational problem.
    Args:
        data (dict): Input data for solving.
    Returns:
        dict: Results of the computation.
    """
    # Simulate computation
    result = {
        "status": "success",
        "data": {"solution": sum(data.get("numbers", []))},
    }
    return result
