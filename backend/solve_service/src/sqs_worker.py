"""
SQS Worker for the solve service.

This module provides the main entry point for running the SQS-based
solve worker that replaces the Celery worker.
"""

import asyncio
import signal
import sys

from loguru import logger

from sqs_consumer import create_sqs_consumer


class SQSWorker:
    """
    Main SQS worker class that manages the consumer lifecycle.
    """

    def __init__(self):
        self.consumer = None
        self.shutdown_event = asyncio.Event()

    async def start(self):
        """
        Start the SQS worker.
        """
        logger.info("Starting SQS solve worker...")

        # Create the consumer
        self.consumer = await create_sqs_consumer()

        # Set up signal handlers for graceful shutdown
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, self._signal_handler)

        try:
            # Start consuming in the background
            consumer_task = asyncio.create_task(
                self.consumer.start_consuming()
            )

            # Wait for shutdown signal
            await self.shutdown_event.wait()

            # Stop the consumer
            self.consumer.stop_consuming()

            # Wait for the consumer task to complete
            await consumer_task

        except Exception as e:
            logger.error(f"Error in SQS worker: {e}")
            raise
        finally:
            logger.info("SQS solve worker stopped")

    def _signal_handler(self, signum, frame):
        """
        Handle shutdown signals.
        """
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.shutdown_event.set()


async def main():
    """
    Main entry point for the SQS worker.
    """
    worker = SQSWorker()
    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
    except Exception as e:
        logger.error(f"Worker failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
