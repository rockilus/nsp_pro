"""Migration script to test new database architecture."""

import asyncio
import os
import sys

from shared.logger import log_info

from src.database_setup import setup_database, shutdown_database

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))


async def test_migration():
    """Test the new database setup."""
    try:
        log_info("Testing new database architecture...")

        # Setup database
        db_collections = await setup_database()

        # Test basic operations
        health_check = await db_collections.database_interface.health_check()
        log_info(f"Database health check: {'✓' if health_check else '✗'}")

        # Test repository access
        assignments = db_collections.assignment_db.get_assignments("test-team")
        log_info(
            f"Assignment repository test: ✓ " f"(found {len(assignments)} assignments)"
        )

        # Test other repositories
        teams = db_collections.team_db.get_teams()
        log_info(f"Team repository test: ✓ (found {len(teams)} teams)")

        workers = db_collections.worker_db.get_workers("test-team")
        log_info(f"Worker repository test: ✓ (found {len(workers)} workers)")

        log_info("Migration test completed successfully!")

    except Exception as e:
        log_info(f"Migration test failed: {str(e)}")
        raise
    finally:
        await shutdown_database()


if __name__ == "__main__":
    asyncio.run(test_migration())
