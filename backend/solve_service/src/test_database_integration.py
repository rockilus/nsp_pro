"""Test script for database integration."""

import asyncio

from loguru import logger

from database_setup import setup_database, shutdown_database


async def test_database_connection():
    """Test database connection and basic operations."""
    try:
        logger.info("Testing database connection...")

        # Setup database
        collections = await setup_database()
        logger.info("✅ Database setup successful")

        # Test basic operations
        schedules = collections.schedule_db.get_schedules("test-team")
        logger.info(f"✅ Database query successful: found {len(schedules)} schedules")

        # Test solve task status operations
        solve_statuses = (
            collections.solve_task_status_db.get_pending_or_in_progress_by_schedule_id(
                "test-schedule"
            )
        )
        logger.info(
            f"✅ Solve status query successful: found {len(solve_statuses)} statuses"
        )

        logger.info("✅ All database tests passed!")

    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        raise
    finally:
        await shutdown_database()


async def main():
    """Run database integration tests."""
    await test_database_connection()


if __name__ == "__main__":
    asyncio.run(main())
