"""
API Gateway SQS Solve Service.

This service handles the integration between the API Gateway and the SQS-based
solve workflow. It manages authorization, validation, and coordination with
the shared SQS service.
"""

from datetime import datetime, timezone

from loguru import logger
from shared.aws.config import AWSConfig
from shared.aws.sqs_client import SQSClient
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import SolveRequestStatus, SolveTaskStatus
from shared.schemas.core.solve_task_status import ScheduleSolveStatus
from shared.services.sqs_solve_service import SQSSolveService

from src.services.base_service import BaseService


class APIGatewaySQSSolveService(BaseService):
    """
    API Gateway service for handling SQS-based solve requests.

    This service orchestrates the solve request workflow:
    1. Validates the request
    2. Updates schedule status to pending
    3. Submits request to SQS
    4. Handles errors and rollback
    """

    def __init__(
        self,
        collection: DatabaseCollections,
        sqs_solve_service: SQSSolveService,
    ):
        """Initialize the service.

        Args:
            sqs_solve_service: Shared SQS solve service
            schedule_service: Schedule service for database operations
        """
        super().__init__(collection)
        self.sqs_solve_service = sqs_solve_service

    async def submit_solve_request(self, schedule_id: str, team_id: str, user_id: str):
        """
        Submit a solve request via SQS and create a SolveTaskStatus object.
        Returns the SolveTaskStatusSchema object (MongoDB schema).
        """

        logger.info(
            f"Submitting SQS solve request for schedule {schedule_id} "
            f"by user {user_id}"
        )

        # Get the schedule and validate it exists
        schedule = self.collection.schedule_db.get_schedule_by_id(schedule_id)
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")

        # Check if schedule is already being solved using SolveTaskStatus
        # fmt: off
        existing_statuses = self.collection.solve_task_status_db\
            .get_pending_or_in_progress_by_schedule_id(
                schedule_id=schedule_id
            )
        # fmt: on
        if existing_statuses:
            raise ValueError(f"Schedule {schedule_id} is already being solved ")

        try:
            # Submit to SQS
            message_id = await self.sqs_solve_service.submit_solve_request(
                schedule_id=schedule_id,
                team_id=team_id,
                user_id=user_id,
            )

            # Create SolveTaskStatus object (PENDING)
            solve_task_status = SolveTaskStatus(
                id=None,
                solve_id=message_id,
                schedule_id=schedule_id,
                team_id=team_id,
                user_id=user_id,
                request_status=SolveRequestStatus.PENDING,
                solve_status=ScheduleSolveStatus.NOT_SOLVED,
                started_at=datetime.now(tz=timezone.utc),
                completed_at=None,
                error_message=None,
                result=None,
                solver_output_metadata=None,
            )
            sts_saved = self.collection.solve_task_status_db.create_solve_task_status(
                solve_task_status=solve_task_status
            )

            logger.info(
                f"Successfully submitted solve request for schedule {schedule_id}. "
                f"Message ID: {message_id}"
            )

            return sts_saved

        except Exception as e:
            logger.error(
                f"Failed to submit solve request for schedule {schedule_id}: {e}"
            )
            raise

    async def get_solve_status(self, solve_id: str) -> SolveTaskStatus:
        """
        Get the current solve status for a solve task by solve_id.
        Returns the SolveTaskStatusResponseDTO or raises if not found.
        """
        solve_task_status = (
            self.collection.solve_task_status_db.get_solve_task_status_by_solve_id(
                solve_id
            )
        )
        if not solve_task_status:
            raise ValueError(f"Solve task with id {solve_id} not found")
        return solve_task_status


def create_sqs_solve_service(
    collection: DatabaseCollections,
) -> APIGatewaySQSSolveService:
    """
    Factory function to create an API Gateway SQS Solve Service.

    Args:
        schedule_service: Schedule service instance

    Returns:
        Configured APIGatewaySQSSolveService
    """
    # Create AWS config and SQS client
    aws_config = AWSConfig()
    sqs_client = SQSClient(aws_config)

    # Create shared SQS solve service
    sqs_solve_service = SQSSolveService(sqs_client)

    return APIGatewaySQSSolveService(
        collection=collection,
        sqs_solve_service=sqs_solve_service,
    )
