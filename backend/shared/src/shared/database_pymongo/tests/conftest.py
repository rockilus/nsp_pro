# import pytest
# from pymongo import MongoClient
# from pymongo.database import Database

# from shared.database_pymongo.config import Config
# from shared.database_pymongo.database import MongoDB
# from shared.database_pymongo.repositories.user import (
#     UserRepository,
# )
# from shared.database_pymongo.repositories.shift import (
#     ShiftRepository,
# )
# from shared.database_pymongo.schemas.user import UserCreateSchema
# from shared.database_pymongo.schemas.shift import StaffingSchema
# from shared.schemas.schemas.shift import (
#     ShiftType,
#     ShiftRestType,
#     ShiftLeaveType,
# )


# @pytest.fixture(scope="session")
# def mongo_client():
#     """Create a MongoDB client for testing."""
#     client = MongoClient(Config.TEST_MONGODB_URI)
#     yield client
#     client.close()


# @pytest.fixture(scope="function")
# def test_db(mongo_client):
#     """Create a test database and collections."""
#     db_name = Config.TEST_DATABASE_NAME
#     db = mongo_client[db_name]

#     # Clear existing test data
#     mongo_client.drop_database(db_name)

#     # Setup MongoDB class to use test database
#     MongoDB._client = mongo_client
#     MongoDB._db = db

#     yield db

#     # Clean up after test
#     mongo_client.drop_database(db_name)
#     MongoDB._client = None
#     MongoDB._db = None


# @pytest.fixture
# def user_repository(test_db):
#     """User repository fixture."""
#     return UserRepository()


# @pytest.fixture
# def shift_repository(test_db):
#     """Shift repository fixture."""
#     return ShiftRepository()


# @pytest.fixture
# def sample_user():
#     """Sample user data."""
#     return UserCreateSchema(
#         id="user_test_001",
#         email="test@example.com",
#         first_name="Test",
#         last_name="User",
#         language="en",
#         workers=[],
#     )


# @pytest.fixture
# def created_user(user_repository, sample_user):
#     """Create a user in the database."""
#     return user_repository.create_user(sample_user)


# @pytest.fixture
# def sample_shift():
#     """Sample shift data."""
#     return ShiftCreateSchema(
#         id="shift_test_001",
#         team="team_test_001",
#         name="Morning Shift",
#         acronym="MS",
#         acronym_custom=False,
#         start_time=8.0,
#         end_time=16.0,
#         staffing=[StaffingSchema(specialty="specialty_001", staffing=2)],
#         color="#FF5733",
#         shift_type=ShiftType.NORMAL,
#         rest_type=ShiftRestType.PARTIAL,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=30,
#         recuperation_duty=None,
#         deleted=False,
#     )


# @pytest.fixture
# def created_shift(shift_repository, sample_shift):
#     """Create a shift in the database."""
#     return shift_repository.create_shift(sample_shift)
