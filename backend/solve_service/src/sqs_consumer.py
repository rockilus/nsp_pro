"""
SQS Consumer for processing solve requests in the solve service.

This module provides the SQSSolveConsumer, which listens to the SQS queue
for solve requests and processes them using the existing solve logic.
"""

import asyncio
import time
from typing import Dict

from loguru import logger

from shared.schemas.core import Schedule
from shared.schemas.sqs_messages import SolveRequestMessage
from shared.services.factory import get_sqs_solve_service
from shared.services.sqs_solve_service import SQSSolveService
from db_operations.get_engine_inputs import get_engine_inputs
from db_operations.save_engine_outputs import save_engine_outputs
from db_operations.setup_database import get_collections
from solve_service.solve_schedule import solve_schedule


class SQSSolveConsumer:
    """
    Consumer for processing solve requests from SQS queue.

    This class handles the lifecycle of processing solve requests:
    - Polling the SQS queue for messages
    - Processing solve requests
    - Updating the schedule with results
    - Handling errors and retries
    """

    def __init__(self, sqs_solve_service: SQSSolveService):
        self.sqs_solve_service = sqs_solve_service
        self.collections = get_collections()
        self.running = False

    async def start_consuming(self):
        """
        Start consuming messages from the SQS queue.

        This method runs indefinitely, polling for messages and processing them.
        """
        self.running = True
        logger.info("Starting SQS solve consumer...")

        while self.running:
            try:
                # Poll for messages
                messages = self.sqs_solve_service.receive_solve_requests(
                    max_messages=1, wait_time_seconds=20  # Long polling
                )

                if not messages:
                    continue

                for message_data in messages:
                    try:
                        await self._process_message(message_data)
                    except Exception as e:
                        logger.error(f"Failed to process message: {e}")
                        # Message will be returned to queue for retry

            except Exception as e:
                logger.error(f"Error in SQS consumer loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying

    async def _process_message(self, message_data: dict):
        """
        Process a single solve request message.

        Args:
            message_data: Dictionary containing message content and metadata
        """
        message_content = message_data["message"]
        receipt_handle = message_data["receipt_handle"]

        logger.info(
            f"Processing solve request for schedule {message_content.schedule_id}"
        )

        try:
            # Process the solve request
            result = await self._solve_schedule(message_content)

            # Update schedule with success
            await self._update_schedule_success(
                message_content.schedule_id, result, message_content.message_id
            )

            # Delete message from queue
            self.sqs_solve_service.delete_message(receipt_handle)

            logger.info(
                f"Successfully processed solve request for schedule "
                f"{message_content.schedule_id}"
            )

        except Exception as e:
            logger.error(
                f"Failed to process solve request for schedule "
                f"{message_content.schedule_id}: {e}"
            )

            # Update schedule with failure
            await self._update_schedule_failure(
                message_content.schedule_id, str(e), message_content.message_id
            )

            # Delete message to prevent retry (or implement retry logic)
            self.sqs_solve_service.delete_message(receipt_handle)

    async def _solve_schedule(self, message: SolveRequestMessage) -> Dict:
        """
        Execute the solve operation for a schedule.

        Args:
            message: The solve request message

        Returns:
            Dictionary containing the solve results
        """
        start_time = time.time()

        # Get the schedule from the database
        schedule = self.collections.schedule_db.get_schedule_by_id(
            str(message.schedule_id)
        )

        if not schedule:
            raise ValueError(f"Schedule {message.schedule_id} not found")

        # Get engine inputs
        engine_inputs = get_engine_inputs(schedule, self.collections)

        # Solve the schedule
        engine_outputs = solve_schedule(engine_inputs)

        # Save the outputs
        eo_augmented = save_engine_outputs(
            engine_inputs,
            engine_outputs,
            message.message_id,  # Use SQS message ID as task ID
            self.collections,
        )

        end_time = time.time()
        total_time = end_time - start_time

        logger.info(
            f"Solve completed in {total_time:.2f}s for schedule {message.schedule_id}"
        )

        return {"eo_augmented": eo_augmented.to_dict()}

    async def _update_schedule_success(
        self, schedule_id: str, result: Dict, task_id: str
    ):
        """
        Update the schedule with successful solve results.

        Args:
            schedule_id: The ID of the schedule
            result: The solve results
            task_id: The task/message ID
        """
        from shared.schemas.core.schedule import (
            SolveDetails,
            SolveDetailsStatus,
        )
        from datetime import datetime, timezone

        schedule = self.collections.schedule_db.get_schedule_by_id(schedule_id)
        if schedule:
            schedule.solve_details = SolveDetails(
                task_id=task_id,
                status=SolveDetailsStatus.SUCCESS,
                updated_at=datetime.now(tz=timezone.utc),
                result=result,
            )
            self.collections.schedule_db.update_schedule(schedule)

    async def _update_schedule_failure(
        self, schedule_id: str, error: str, task_id: str
    ):
        """
        Update the schedule with failure information.

        Args:
            schedule_id: The ID of the schedule
            error: The error message
            task_id: The task/message ID
        """
        from shared.schemas.core.schedule import (
            SolveDetails,
            SolveDetailsStatus,
        )
        from datetime import datetime, timezone

        schedule = self.collections.schedule_db.get_schedule_by_id(schedule_id)
        if schedule:
            schedule.solve_details = SolveDetails(
                task_id=task_id,
                status=SolveDetailsStatus.FAILURE,
                updated_at=datetime.now(tz=timezone.utc),
                result={"error": error},
            )
            self.collections.schedule_db.update_schedule(schedule)

    def stop_consuming(self):
        """
        Stop the consumer gracefully.
        """
        logger.info("Stopping SQS solve consumer...")
        self.running = False


async def create_sqs_consumer() -> SQSSolveConsumer:
    """
    Factory function to create an SQS consumer.

    Returns:
        Configured SQSSolveConsumer instance
    """
    sqs_solve_service = get_sqs_solve_service()
    return SQSSolveConsumer(sqs_solve_service)
