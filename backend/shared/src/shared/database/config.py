import os

from dotenv import load_dotenv

load_dotenv()


# pylint: disable=too-few-public-methods
class Config:
    """Application configuration."""

    # MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    # DATABASE_NAME = os.getenv("DATABASE_NAME", "app_database")
    TEST_MONGODB_URI = os.getenv("TEST_MONGODB_URI", "mongodb://localhost:27017")
    TEST_DATABASE_NAME = os.getenv("TEST_DATABASE_NAME", "test_database")
