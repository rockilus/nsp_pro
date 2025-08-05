from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.user import UserRepository
from shared.database.schemas.user import UserSchema
from shared.schemas.core.user import Language, User
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestUserRepository:
    repo: UserRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = UserRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("users")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_user(self):
        """Test creating a user."""
        user = User(
            id="user_0",
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language=Language.EN,
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user_id=None,
        )

        result = self.repo.create_user(user)

        assert result.id == "user_0"
        assert result.email == "john@example.com"
        assert result.first_name == "John"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["email"] == "john@example.com"
        assert saved_doc["first_name"] == "John"

    def test_get_user_by_id(self):
        """Test getting a user by ID."""
        user = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        created = self.repo.create(user)

        found = self.repo.get_user_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.email == "john@example.com"

    def test_get_user_by_email(self):
        """Test getting a user by email."""
        user = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        created = self.repo.create(user)

        found = self.repo.get_user_by_email("john@example.com")

        assert found is not None
        assert found.id == created.id
        assert found.email == "john@example.com"

    def test_update_user(self):
        """Test updating a user."""
        user = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        created = self.repo.create(user)

        updated_user = User(
            id=created.id,
            email="john@example.com",
            first_name="John Updated",
            last_name="Doe",
            language=Language.EN,
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user_id=None,
        )

        result = self.repo.update_user(updated_user)

        assert result.first_name == "John Updated"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["first_name"] == "John Updated"

    def test_delete_user(self):
        """Test deleting a user."""
        user = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        created = self.repo.create(user)

        self.repo.delete_user(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_users(self):
        """Test getting all users."""
        user1 = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        user2 = UserSchema(
            email="jane@example.com",
            first_name="Jane",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        self.repo.create(user1)
        self.repo.create(user2)

        users = self.repo.get_users()

        assert len(users) == 2
        assert users[0].email in ["john@example.com", "jane@example.com"]
        assert users[1].email in ["john@example.com", "jane@example.com"]

    def test_get_users_by_ids(self):
        """Test getting users by a list of IDs."""
        user1 = UserSchema(
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        user2 = UserSchema(
            email="jane@example.com",
            first_name="Jane",
            last_name="Doe",
            language="en",
            sign_up_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            impersonating_user=None,
        )
        created_user1 = self.repo.create(user1)
        created_user2 = self.repo.create(user2)

        user_ids = [created_user1.id, created_user2.id]
        users = self.repo.get_users_by_ids(user_ids)

        assert len(users) == 2
        assert users[0].id in user_ids
        assert users[1].id in user_ids
        assert users[0].email in ["john@example.com", "jane@example.com"]
        assert users[1].email in ["john@example.com", "jane@example.com"]
