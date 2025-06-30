"""
API Gateway SQS Solve Service.

This service handles the integration between the API Gateway and the SQS-based
solve workflow. It manages authorization, validation, and coordination with
the shared SQS service.
"""

from datetime import datetime, timezone
from typing import Dict, Optional
from uuid import UUID

from loguru import logger

from shared.aws.config import AWSConfig
from shared.aws.sqs_client import SQSClient
from shared.schemas.core.schedule import SolveDetails, SolveDetailsStatus
from shared.schemas.sqs_messages import (
    SolveRequestPriority,
    SolveRequestType,
    SQSSolveMessage,
)
from shared.services.sqs_solve_service import SQSSolveService
from src.services.schedule_service import ScheduleService


class APIGatewaySQSSolveService:
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
        sqs_solve_service: SQSSolveService,
        schedule_service: ScheduleService,
    ):
        """Initialize the service.

        Args:
            sqs_solve_service: Shared SQS solve service
            schedule_service: Schedule service for database operations
        """
        self.sqs_solve_service = sqs_solve_service
        self.schedule_service = schedule_service

    async def submit_solve_request(
        self,
        schedule_id: str,
        team_id: str,
        user_id: str,
        priority: SolveRequestPriority = SolveRequestPriority.NORMAL,
        request_type: SolveRequestType = SolveRequestType.FULL_SOLVE,
        constraints: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, str]:
        """
        Submit a solve request via SQS.

        Args:
            schedule_id: ID of the schedule to solve
            team_id: Team ID for authorization
            user_id: User ID who initiated the request
            priority: Priority of the solve request
            request_type: Type of solve request
            constraints: Additional constraints for solving
            metadata: Additional metadata

        Returns:
            Dictionary containing message_id and status

        Raises:
            ValueError: If schedule not found or invalid
            Exception: For other processing errors
        """
        logger.info(
            f"Submitting SQS solve request for schedule {schedule_id} "
            f"by user {user_id} with priority {priority.value}"
        )

        # Get the schedule and validate it exists
        schedule = (
            self.schedule_service.collection.schedule_db.get_schedule_by_id(
                schedule_id
            )
        )
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")

        # Check if schedule is already being solved
        if schedule.solve_details and schedule.solve_details.status in [
            SolveDetailsStatus.PENDING,
            SolveDetailsStatus.STARTED,
        ]:
            raise ValueError(
                f"Schedule {schedule_id} is already being solved "
                f"(status: {schedule.solve_details.status.name})"
            )

        try:
            # Submit to SQS
            message_id = await self.sqs_solve_service.submit_solve_request(
                schedule_id=schedule_id,
                team_id=team_id,
                user_id=user_id,
                request_type=request_type,
                priority=priority,
                constraints=constraints,
                metadata=metadata,
            )

            # Update schedule status to pending
            schedule.solve_details = SolveDetails(
                task_id=message_id,
                status=SolveDetailsStatus.PENDING,
                updated_at=datetime.now(tz=timezone.utc),
                result=None,
            )
            self.schedule_service.collection.schedule_db.update_schedule(
                schedule
            )

            logger.info(
                f"Successfully submitted solve request for schedule {schedule_id}. "
                f"Message ID: {message_id}"
            )

            return {
                "message_id": message_id,
                "status": "PENDING",
                "schedule_id": schedule_id,
            }

        except Exception as e:
            logger.error(
                f"Failed to submit solve request for schedule {schedule_id}: {e}"
            )
            # If we had started updating the schedule, we should rollback
            # but since we update after SQS submission, no rollback needed
            raise

    async def get_solve_status(self, schedule_id: str) -> Dict[str, str]:
        """
        Get the current solve status for a schedule.

        Args:
            schedule_id: ID of the schedule

        Returns:
            Dictionary containing status information
        """
        schedule = (
            self.schedule_service.collection.schedule_db.get_schedule_by_id(
                schedule_id
            )
        )
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")

        if not schedule.solve_details:
            return {"status": "NOT_SOLVED", "schedule_id": schedule_id}

        return {
            "status": schedule.solve_details.status.name,
            "task_id": schedule.solve_details.task_id,
            "updated_at": schedule.solve_details.updated_at.isoformat(),
            "schedule_id": schedule_id,
        }


def create_sqs_solve_service(
    schedule_service: ScheduleService,
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
        sqs_solve_service=sqs_solve_service,
        schedule_service=schedule_service,
    )
