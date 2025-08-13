import os
import subprocess
import time
from typing import AsyncGenerator

import pytest_asyncio

from shared.database.config import DatabaseConfig, DatabaseType
from shared.database.factory import DatabaseFactory
from shared.database.interface import DatabaseInterface

# from shared.database.database import MongoDB


@pytest_asyncio.fixture(scope="session")
async def mongodb_container() -> AsyncGenerator[DatabaseInterface, None]:
    """Provide MongoDB connection for testing."""

    # Check if running in GitHub Actions
    if "MONGO_URI" in os.environ:
        # Use the GitHub Actions service connection
        connection_string = os.environ["MONGO_URI"]

        # Test connection
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=connection_string,
            database_name="test_db",
        )
        provider = DatabaseFactory.create_provider(config)
        await provider.connect()
        if not await provider.health_check():
            raise ValueError("Failed to connect to MongoDB")

        try:
            yield provider
        finally:
            await provider.disconnect()

        # MongoDB.connect(connection_string, "test_db")
        # if not MongoDB.check_health():
        #     raise ValueError("Failed to connect to MongoDB")

        # yield connection_string

    else:
        # Local development - start container
        file_path_compose = os.path.join(
            os.path.dirname(__file__), "docker-compose.yml"
        )
        command = [
            "docker-compose",
            "-f",
            file_path_compose,
            "up",
            "-d",
            "mongodb-shared-tests",
        ]
        try:
            result = subprocess.run(
                command,
                # shell=True,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            print(result.stdout.decode("utf-8"))
            # return result.stdout.decode('utf-8')
        except subprocess.CalledProcessError as e:
            error_message = (
                f"Command '{command}' failed with error: " f"{e.stderr.decode('utf-8')}"
            )
            raise RuntimeError(error_message) from e

        # Wait for MongoDB to be ready
        connection_string = "mongodb://testuser:testpass@localhost:27017/"
        max_retries = 5
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=connection_string,
            database_name="test_db",
        )

        provider = None
        for _ in range(max_retries):
            try:
                provider = DatabaseFactory.create_provider(config)
                await provider.connect()
                if await provider.health_check():
                    break
                await provider.disconnect()
            except Exception:  # pylint: disable=broad-except
                pass
            time.sleep(2)

        if not provider or not await provider.health_check():
            raise RuntimeError("Failed to connect to MongoDB after retries")

        try:
            yield provider
        finally:
            if provider:
                await provider.disconnect()

            # Cleanup Docker container
            cleanup_command = [
                "docker-compose",
                "-f",
                file_path_compose,
                "down",
                "-v",
            ]
            try:
                subprocess.run(cleanup_command, check=True)
            except subprocess.CalledProcessError as e:
                raise RuntimeError(
                    f"Cleanup command '{cleanup_command}' "
                    + f"failed with error: {e.stderr.decode('utf-8')}"
                ) from e


# @pytest.fixture(scope="module")
# def mongo_uri() -> str:
#     return "mongodb://localhost:27017"


# @pytest.fixture(scope="module")
# def db_name() -> str:
#     return "test_db"


# # @pytest.fixture(scope="module")
# @pytest.fixture(scope="session")
# def setup_database() -> Database:
#     # Setup: Connect to the database and prepare data
#     db = MongoDB.connect(mongo_uri, db_name)
#     yield db  # Provide the fixture value
#     # Teardown: Clean up the database
#     db.drop_collection("shifts")
#     MongoDB.close()
