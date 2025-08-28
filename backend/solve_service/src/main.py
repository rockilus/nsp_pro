"""
Main entry point for NSP Pro Solve Service.

This module provides the main entry point for the SQS-based solve service
with proper database lifecycle management and graceful shutdown handling.
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from typing import Optional

from loguru import logger
from shared.aws.config import AWSConfig
from shared.database.database_collections import DatabaseCollections
from shared.services.factory import create_sqs_solve_service

from config import config
from database_setup import setup_database, shutdown_database
from sqs_consumer import SQSSolveConsumer


class SolveService:
    """
    Main solve service that manages SQS consumer lifecycle with database connections.

    This service handles:
    - Database setup and teardown
    - SQS consumer management
    - Graceful shutdown on signals
    - Error handling and logging
    """

    def __init__(self) -> None:
        self.consumer: Optional[SQSSolveConsumer] = None
        self.collections: Optional[DatabaseCollections] = None
        self.shutdown_event = asyncio.Event()
        self._consumer_task: Optional[asyncio.Task] = None

    @asynccontextmanager
    async def database_lifespan(self):
        """
        Database lifecycle manager ensuring proper setup and cleanup.
        """
        try:
            logger.info("Setting up database connections...")
            self.collections = await setup_database()
            logger.info(
                f"Database setup completed using {config.environment} configuration"
            )
            yield self.collections
        except Exception as e:
            logger.error(f"Database setup failed: {e}")
            raise
        finally:
            if self.collections:
                logger.info("Shutting down database connections...")
                await shutdown_database()
                logger.info("Database shutdown completed")

    async def start(self):
        """
        Start the solve service with proper lifecycle management.
        """
        logger.info("Starting NSP Pro Solve Service...")
        logger.info(f"Environment: {config.environment}")
        logger.info(f"SQS Queue: {config.sqs_queue_name}")

        # Set up signal handlers for graceful shutdown
        self._setup_signal_handlers()

        try:
            async with self.database_lifespan() as collections:
                # Create AWS configuration
                aws_config = AWSConfig(
                    region=config.aws_region,
                    aws_access_key_id=config.aws_access_key_id,
                    aws_secret_access_key=config.aws_secret_access_key,
                    aws_session_token=config.aws_session_token,
                    endpoint_url=config.endpoint_url,
                    sqs_solve_queue_name=config.sqs_queue_name,
                )

                # Create SQS service
                sqs_service = await create_sqs_solve_service(config=aws_config)
                logger.info("SQS service created successfully")

                # Create consumer with database collections
                self.consumer = SQSSolveConsumer(sqs_service, collections)

                # Start consuming messages
                logger.info("Starting SQS consumer...")
                self._consumer_task = asyncio.create_task(
                    self.consumer.start_consuming()
                )

                # Wait for shutdown signal
                await self.shutdown_event.wait()

                # Graceful shutdown
                await self._graceful_shutdown()

        except KeyboardInterrupt:
            logger.info("Service interrupted by user")
        except Exception as e:
            logger.error(f"Service failed with error: {e}")
            raise
        finally:
            logger.info("NSP Pro Solve Service stopped")

    def _setup_signal_handlers(self):
        """
        Set up signal handlers for graceful shutdown.
        """

        def signal_handler(signum, _):
            logger.info(f"Received signal {signum}, initiating graceful shutdown...")
            self.shutdown_event.set()

        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, signal_handler)

    async def _graceful_shutdown(self):
        """
        Perform graceful shutdown of the service.
        """
        logger.info("Initiating graceful shutdown...")

        # Stop the consumer
        if self.consumer:
            logger.info("Stopping SQS consumer...")
            self.consumer.running = False

        # Wait for consumer task to complete (with timeout)
        if self._consumer_task and not self._consumer_task.done():
            try:
                await asyncio.wait_for(self._consumer_task, timeout=30.0)
                logger.info("Consumer stopped gracefully")
            except asyncio.TimeoutError:
                logger.warning("Consumer shutdown timed out, forcing stop")
                self._consumer_task.cancel()

        logger.info("Graceful shutdown completed")


async def main():
    """
    Main entry point for the solve service.

    This function creates and starts the solve service, handling any
    startup errors and ensuring proper exit codes.
    """
    service = SolveService()

    try:
        await service.start()
    except KeyboardInterrupt:
        logger.info("Service interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Service failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
