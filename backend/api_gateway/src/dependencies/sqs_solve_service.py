"""
Dependency injection for SQS solve service in API Gateway.
"""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.sqs_solve_service import (
    APIGatewaySQSSolveService,
    create_sqs_solve_service,
)


def get_sqs_solve_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> APIGatewaySQSSolveService:
    """
    FastAPI dependency for SQS solve service.

    Args:
        schedule_service: Schedule service dependency

    Returns:
        Configured SQS solve service
    """
    return create_sqs_solve_service(collection=db_collections)
