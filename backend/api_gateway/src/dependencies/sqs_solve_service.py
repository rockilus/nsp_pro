"""
Dependency injection for SQS solve service in API Gateway.
"""

from fastapi import Depends

from src.dependencies import get_schedule_service
from src.services.api_gateway_sqs_solve_service import (
    APIGatewaySQSSolveService,
    create_sqs_solve_service,
)
from src.services.schedule_service import ScheduleService


def get_sqs_solve_service(
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> APIGatewaySQSSolveService:
    """
    FastAPI dependency for SQS solve service.

    Args:
        schedule_service: Schedule service dependency

    Returns:
        Configured SQS solve service
    """
    return create_sqs_solve_service(schedule_service)
