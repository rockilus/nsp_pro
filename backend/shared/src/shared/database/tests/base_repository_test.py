import pytest_asyncio
from bson import ObjectId

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.base import DocumentBaseSchema


class TestUserSchema(DocumentBaseSchema):
    name: str
    email: str
    age: int


class TestBaseRepository:
    repo: BaseRepository[TestUserSchema]

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create test collection
        collection_name = "test_users"

        # Create repository
        self.repo = BaseRepository(
            database_interface=mongodb_container,
            collection_name=collection_name,
            schema_cls=TestUserSchema,
        )

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection(collection_name)  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create(self):
        """Test creating a document."""
        # Create test user
        user = TestUserSchema(
            name="John Doe",
            email="john@example.com",
            age=30,
        )

        # Save to database
        result = self.repo.create(user)

        # Verify result
        assert result.id is not None
        assert result.name == "John Doe"
        assert result.email == "john@example.com"

        # Verify document was saved to database
        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "John Doe"
        assert saved_doc["email"] == "john@example.com"
        assert saved_doc["age"] == 30

    def test_create_many(self):
        """Test creating multiple documents."""
        # Create test users
        users = [
            TestUserSchema(name="John Doe", email="john@example.com", age=30),
            TestUserSchema(name="Jane Smith", email="jane@example.com", age=25),
            TestUserSchema(name="Bob Johnson", email="bob@example.com", age=40),
        ]

        # Save to database
        results = self.repo.create_many(users)

        # Verify results
        assert len(results) == 3
        for result in results:
            assert result.id is not None

        # Verify documents were saved
        assert self.repo.collection.count_documents({}) == 3

        # Check specific document
        jane = self.repo.collection.find_one({"email": "jane@example.com"})
        assert jane is not None
        assert jane["name"] == "Jane Smith"
        assert jane["age"] == 25

    def test_find_by_id(self):
        """Test finding a document by ID."""
        # Create test user
        user = TestUserSchema(name="John Doe", email="john@example.com", age=30)
        created = self.repo.create(user)

        # Find by ID
        found = self.repo.find_by_id(created.id)

        # Verify result
        assert found is not None
        assert found.id == created.id
        assert found.name == "John Doe"
        assert found.email == "john@example.com"
        assert found.age == 30

        # Test non-existent ID
        not_found = self.repo.find_by_id(ObjectId())
        assert not_found is None

    def test_find_all(self):
        """Test finding all documents with filtering, limit, and skip."""
        # Create test users
        users = [
            TestUserSchema(name="John Doe", email="john@example.com", age=30),
            TestUserSchema(name="Jane Smith", email="jane@example.com", age=25),
            TestUserSchema(name="Bob Johnson", email="bob@example.com", age=40),
            TestUserSchema(name="Alice Brown", email="alice@example.com", age=35),
            TestUserSchema(name="Charlie Davis", email="charlie@example.com", age=45),
        ]
        self.repo.create_many(users)

        # Test finding all
        all_users = self.repo.find_all()
        assert len(all_users) == 5

        # Test with filter
        adults = self.repo.find_all({"age": {"$gte": 35}})
        assert len(adults) == 3
        assert sorted([u.name for u in adults]) == [
            "Alice Brown",
            "Bob Johnson",
            "Charlie Davis",
        ]

        # Test with limit
        limited = self.repo.find_all(limit=2)
        assert len(limited) == 2

        # Test with skip
        skipped = self.repo.find_all(skip=2, limit=2)
        assert len(skipped) == 2
        # Names will depend on insertion order, but we know there should be 2

    def test_update(self):
        """Test updating a document."""
        # Create test user
        user = TestUserSchema(name="John Doe", email="john@example.com", age=30)
        created = self.repo.create(user)

        # Update user
        user.name = "John Updated"
        user.age = 31
        updated = self.repo.update(user)

        # Verify update
        assert updated is not None
        assert updated.name == "John Updated"
        assert updated.email == "john@example.com"  # Unchanged
        assert updated.age == 31

        # Verify in database
        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "John Updated"
        assert from_db["age"] == 31

    def test_delete(self):
        """Test deleting a document."""
        # Create test user
        user = TestUserSchema(name="John Doe", email="john@example.com", age=30)
        created = self.repo.create(user)

        # Delete user
        result = self.repo.delete(created.id)

        # Verify deletion
        assert result is True
        assert self.repo.collection.find_one({"_id": created.id}) is None

        # Test deleting non-existent document
        result = self.repo.delete(ObjectId())
        assert result is False

    def test_count(self):
        """Test counting documents."""
        # Create test users
        users = [
            TestUserSchema(name="John Doe", email="john@example.com", age=30),
            TestUserSchema(name="Jane Smith", email="jane@example.com", age=25),
            TestUserSchema(name="Bob Johnson", email="bob@example.com", age=40),
        ]
        self.repo.create_many(users)

        # Test count all
        assert self.repo.count() == 3

        # Test count with filter
        assert self.repo.count({"age": {"$lt": 30}}) == 1
        assert self.repo.count({"age": {"$gte": 30}}) == 2

    def test_find_one(self):
        """Test finding a single document by filter."""
        # Create test users
        users = [
            TestUserSchema(name="John Doe", email="john@example.com", age=30),
            TestUserSchema(name="Jane Smith", email="jane@example.com", age=25),
        ]
        self.repo.create_many(users)

        # Find one document by filter
        found = self.repo.find_one({"email": "john@example.com"})

        # Verify result
        assert found is not None
        assert found.name == "John Doe"
        assert found.email == "john@example.com"
        assert found.age == 30

        # Test non-existent filter
        not_found = self.repo.find_one({"email": "nonexistent@example.com"})
        assert not_found is None
