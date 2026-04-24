"""
SQS Consumer for processing solve requests in the solve service.

This module provides the SQSSolveConsumer, which listens to the SQS queue
for solve requests and processes them using the existing solve logic.
"""

import asyncio
import time
from datetime import UTC, datetime

from loguru import logger
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    Breach,
    SQSSolveMessage,
    SQSSolveQueueMessage,
    TeamGenerationSettings,
)
from shared.schemas.core.solve_task_status import (
    ResultModel,
    ScheduleSolveStatus,
    SolveRequestStatus,
    SolverOutputMetadata,
)
from shared.services.sqs_solve_service import SQSSolveService

from db_operations.get_engine_inputs import get_engine_inputs
from db_operations.save_engine_outputs import save_engine_outputs
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

    def __init__(
        self,
        sqs_solve_service: SQSSolveService,
        collections: DatabaseCollections,
    ):
        self.sqs_solve_service = sqs_solve_service
        self.collections = collections
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
                # Poll for messages (uses base class method)
                messages = await self.sqs_solve_service.receive_messages(
                    max_messages=1,
                    wait_time_seconds=20,  # Long polling
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

    async def _process_message(
        self, message_data: SQSSolveQueueMessage
    ) -> None:
        """
        Process a single solve request message.

        Args:
            message_data: Dictionary containing message content and metadata
        """
        message_content = message_data.message
        receipt_handle = message_data.receipt_handle
        message_id = message_data.message_id

        logger.info(
            f"Processing solve request for schedule {message_content.schedule_id}"
        )

        try:
            # Process the solve request
            (
                schedule_solve_status,
                assignments,
                breaches,
                solver_output,
            ) = await self._solve_schedule(
                message=message_content, message_id=message_id
            )

            # Update schedule with success
            await self._update_solve_task_status_success(
                message_id=message_id,
                solve_status=schedule_solve_status,
                assignments=assignments,
                breaches=breaches,
                solver_outputs=solver_output,
            )

            # Delete message from queue
            await self.sqs_solve_service.delete_message(
                receipt_handle=receipt_handle
            )

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
            try:
                await self._update_schedule_failure(
                    message_id=message_id, error=str(e)
                )
            except Exception as update_exc:
                logger.error(
                    f"Failed to update schedule failure for message {message_id}: "
                    + f"{update_exc}"
                )

            # Only delete message on failure if we don't want retry
            # For now, delete to prevent infinite retries
            # TO#DO: Implement proper retry logic with max attempts
            await self.sqs_solve_service.delete_message(receipt_handle)

    async def _solve_schedule(
        self, message: SQSSolveMessage, message_id: str
    ) -> tuple[
        ScheduleSolveStatus,
        list[Assignment],
        list[Breach],
        SolverOutputMetadata,
    ]:
        """
        Execute the solve operation for a schedule.

        Args:
            message: The solve request message

        Returns:
            Dictionary containing the solve results
        """
        start_time = time.time()
        # Use self.collections instead of creating new connections
        schedule = self.collections.schedule_db.get_schedule_by_id(
            schedule_id=message.schedule_id
        )
        if not schedule:
            raise ValueError("Schedule not found")
        engine_inputs = get_engine_inputs(
            schedule=schedule,
            collections=self.collections,
        )
        # Load team generation settings
        team_settings = (
            self.collections.team_generation_settings_db.get_by_team_id(
                schedule.team_id
            )
            or TeamGenerationSettings.default(schedule.team_id)
        )
        engine_outputs, processing_cache = solve_schedule(
            engine_inputs=engine_inputs,
            solve_scope=message.solve_scope,
            team_settings=team_settings,
        )
        schedule_solve_status, assignments, breaches, solver_output = (
            save_engine_outputs(
                schedule=schedule,
                engine_intputs=engine_inputs,
                engine_outputs=engine_outputs,
                processing_cache=processing_cache,
                collections=self.collections,
                solve_scope=message.solve_scope,
            )
        )
        end_time = time.time()
        total_time = end_time - start_time
        print("solve campaign time:  " + f"{total_time:.2f}s")
        print("TASK COMPLETE - SOLVE CAMPAIGN: ", message_id)
        return schedule_solve_status, assignments, breaches, solver_output

        # start_time = time.time()

        # # Get the schedule from the database
        # schedule = self.collections.schedule_db.get_schedule_by_id(
        #     str(message.schedule_id)
        # )

        # if not schedule:
        #     raise ValueError(f"Schedule {message.schedule_id} not found")

        # # Get engine inputs
        # engine_inputs = get_engine_inputs(schedule, self.collections)

        # # Solve the schedule
        # engine_outputs = solve_schedule(engine_inputs)

        # # Save the outputs
        # eo_augmented = save_engine_outputs(
        #     engine_inputs,
        #     engine_outputs,
        #     message.message_id,  # Use SQS message ID as task ID
        #     self.collections,
        # )

        # end_time = time.time()
        # total_time = end_time - start_time

        # logger.info(
        #     f"Solve completed in {total_time:.2f}s for schedule {message.schedule_id}"
        # )

        # return {"eo_augmented": eo_augmented.to_dict()}

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    async def _update_solve_task_status_success(
        self,
        message_id: str,
        solve_status: ScheduleSolveStatus,
        assignments: list[Assignment],
        breaches: list[Breach],
        solver_outputs: SolverOutputMetadata,
    ):
        """
        Update the schedule with successful solve results.

        Args:
            schedule_id: The ID of the schedule
            result: The solve results
            task_id: The task/message ID
        """
        solve_task_status = self.collections.solve_task_status_db.get_solve_task_status_by_solve_id(
            solve_id=message_id
        )
        if not solve_task_status:
            raise ValueError(f"Solve task with id {message_id} not found")
        solve_task_status.request_status = SolveRequestStatus.COMPLETED
        solve_task_status.solve_status = solve_status
        solve_task_status.completed_at = datetime.now(tz=UTC)
        solve_task_status.result = ResultModel(
            assignments=assignments,
            breaches=breaches,
            requests=[],
        )
        solve_task_status.solver_output_metadata = solver_outputs
        self.collections.solve_task_status_db.update_solve_task_status(
            solve_task_status=solve_task_status
        )

    async def _update_schedule_failure(self, message_id: str, error: str):
        """
        Update the schedule with failure information.

        Args:
            schedule_id: The ID of the schedule
            error: The error message
            task_id: The task/message ID
        """
        solve_task_status = self.collections.solve_task_status_db.get_solve_task_status_by_solve_id(
            solve_id=message_id
        )
        if not solve_task_status:
            raise ValueError(f"Solve task with id {message_id} not found")
        solve_task_status.request_status = SolveRequestStatus.FAILED
        solve_task_status.completed_at = datetime.now(tz=UTC)
        solve_task_status.error_message = error
        self.collections.solve_task_status_db.update_solve_task_status(
            solve_task_status=solve_task_status
        )

    def stop_consuming(self):
        """
        Stop the consumer gracefully.
        """
        logger.info("Stopping SQS solve consumer...")
        self.running = False
