import os
import subprocess
import time

import pytest

from shared.database.database import MongoDB


@pytest.fixture(scope="session")
def mongodb_container():
    """Provide MongoDB connection for testing."""
    # Check if running in GitHub Actions
    if "MONGO_URI" in os.environ:
        # Use the GitHub Actions service connection
        connection_string = os.environ["MONGO_URI"]

        # Test connection
        MongoDB.connect(connection_string, "test_db")
        if not MongoDB.check_health():
            raise ValueError("Failed to connect to MongoDB")

        yield connection_string

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
            "mongodb",
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
            raise RuntimeError(
                f"Command '{command}' failed with error: {e.stderr.decode('utf-8')}"
            ) from e

        # Wait for MongoDB to be ready
        connection_string = "mongodb://testuser:testpass@localhost:27017/"
        max_retries = 5
        for _ in range(max_retries):
            MongoDB.connect(connection_string, "test_db")
            if MongoDB.check_health():
                break
            time.sleep(2)

        yield connection_string

        # Cleanup
        cleanup_command = ["docker-compose", "-f", file_path_compose, "down"]
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
