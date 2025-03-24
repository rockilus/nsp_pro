import pytest

from shared.database.database import MongoDB
from shared.database.repositories.config import ConfigRepository
from shared.schemas.schemas.config import Config


class TestConfigRepository:
    repo: ConfigRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ConfigRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_config(self):
        """Test creating a config."""
        config = Config(
            id=None,
            signup_emails_whitelist_enabled=True,
            signup_emails_whitelist=["test@example.com"],
            signup_emails_attempt=[],
        )

        result = self.repo.create_config(config)

        assert result.id is not None
        assert result.signup_emails_whitelist_enabled is True
        assert result.signup_emails_whitelist == ["test@example.com"]

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["signup_emails_whitelist_enabled"] is True
        assert saved_doc["signup_emails_whitelist"] == ["test@example.com"]

    def test_get_config(self):
        """Test getting the config."""
        config = Config(
            id=None,
            signup_emails_whitelist_enabled=True,
            signup_emails_whitelist=["test@example.com"],
            signup_emails_attempt=[],
        )
        self.repo.create_config(config)

        result = self.repo.get_config()

        assert result is not None
        assert result.signup_emails_whitelist_enabled is True
        assert result.signup_emails_whitelist == ["test@example.com"]

    def test_update_config(self):
        """Test updating the config."""
        config = Config(
            id=None,
            signup_emails_whitelist_enabled=True,
            signup_emails_whitelist=["test@example.com"],
            signup_emails_attempt=[],
        )
        created = self.repo.create_config(config)

        updated_config = Config(
            id=created.id,
            signup_emails_whitelist_enabled=False,
            signup_emails_whitelist=["updated@example.com"],
            signup_emails_attempt=["attempt@example.com"],
        )

        result = self.repo.update_config(updated_config)

        assert result.signup_emails_whitelist_enabled is False
        assert result.signup_emails_whitelist == ["updated@example.com"]
        assert result.signup_emails_attempt == ["attempt@example.com"]

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["signup_emails_whitelist_enabled"] is False
        assert from_db["signup_emails_whitelist"] == ["updated@example.com"]
        assert from_db["signup_emails_attempt"] == ["attempt@example.com"]

    def test_add_signup_email_attempt(self):
        """Test adding a signup email attempt."""
        config = Config(
            id=None,
            signup_emails_whitelist_enabled=True,
            signup_emails_whitelist=["test@example.com"],
            signup_emails_attempt=[],
        )
        created = self.repo.create_config(config)

        result = self.repo.add_signup_email_attempt("new_attempt@example.com")

        assert "new_attempt@example.com" in result.signup_emails_attempt

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert "new_attempt@example.com" in from_db["signup_emails_attempt"]
