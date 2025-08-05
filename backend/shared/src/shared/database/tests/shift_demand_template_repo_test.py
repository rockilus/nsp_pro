from datetime import datetime, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.shift_demand_template import (
    ShiftDemandTemplateRepository,
)


# Simplified test - focus on database operations rather than domain logic
class TestShiftDemandTemplateRepository:
    """Test suite for ShiftDemandTemplateRepository CRUD operations."""

    repo: ShiftDemandTemplateRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = ShiftDemandTemplateRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("shift_demand_templates")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_repository_initialization(self):
        """Test that repository initializes correctly."""
        assert self.repo is not None
        assert self.repo.collection.name == "shift_demand_templates"

    def test_database_connection(self, mongodb_container: DatabaseInterface):
        """Test that database connection is working."""
        # Simple test to ensure MongoDB connection is available
        db = mongodb_container.get_database()
        assert db is not None

        # Test collection access
        collection = db.shift_demand_templates
        assert collection is not None

    def test_collection_operations(self):
        """Test basic collection operations work."""
        # Insert a test document directly
        test_doc = {
            "name": "Test Template",
            "team": "team1",
            "template_type": "standard",
            "weeks_data": [
                {
                    "week_number": 0,
                    "demands": {
                        "shift1": [1, 1, 1, 1, 1, 0, 0],
                        "shift2": [0, 0, 0, 0, 0, 1, 1],
                    },
                }
            ],
            "description": "Test description",
            "created_by": "test_user",
            "created_at": datetime.now(timezone.utc).timestamp(),
            "updated_at": datetime.now(timezone.utc).timestamp(),
        }

        # Test insert
        result = self.repo.collection.insert_one(test_doc)
        assert result.acknowledged
        assert result.inserted_id is not None

        # Test find
        found_doc = self.repo.collection.find_one({"_id": result.inserted_id})
        assert found_doc is not None
        assert found_doc["name"] == "Test Template"
        assert found_doc["team"] == "team1"
        assert found_doc["template_type"] == "standard"

        # Test update
        update_result = self.repo.collection.update_one(
            {"_id": result.inserted_id}, {"$set": {"name": "Updated Template"}}
        )
        assert update_result.acknowledged
        assert update_result.modified_count == 1

        # Test delete
        delete_result = self.repo.collection.delete_one({"_id": result.inserted_id})
        assert delete_result.acknowledged
        assert delete_result.deleted_count == 1

    def test_multiple_templates_isolation(self):
        """Test that templates are properly isolated by team."""
        # Insert templates for different teams
        template1 = {
            "name": "Team1 Template",
            "team": "team1",
            "template_type": "standard",
            "weeks_data": [{"week_number": 0, "demands": {"shift1": [1] * 7}}],
            "description": None,
            "created_by": "user1",
            "created_at": datetime.now(timezone.utc).timestamp(),
            "updated_at": datetime.now(timezone.utc).timestamp(),
        }

        template2 = {
            "name": "Team2 Template",
            "team": "team2",
            "template_type": "even_odd",
            "weeks_data": [
                {"week_number": 0, "demands": {"shift1": [2] * 7}},
                {"week_number": 1, "demands": {"shift1": [1] * 7}},
            ],
            "description": "Even/odd template",
            "created_by": "user2",
            "created_at": datetime.now(timezone.utc).timestamp(),
            "updated_at": datetime.now(timezone.utc).timestamp(),
        }

        # Insert both templates
        result1 = self.repo.collection.insert_one(template1)
        result2 = self.repo.collection.insert_one(template2)

        assert result1.acknowledged
        assert result2.acknowledged

        # Query by team - should only get team1 template
        team1_templates = list(self.repo.collection.find({"team": "team1"}))
        assert len(team1_templates) == 1
        assert team1_templates[0]["name"] == "Team1 Template"

        # Query by team - should only get team2 template
        team2_templates = list(self.repo.collection.find({"team": "team2"}))
        assert len(team2_templates) == 1
        assert team2_templates[0]["name"] == "Team2 Template"

        # Query by template type
        standard_templates = list(
            self.repo.collection.find({"template_type": "standard"})
        )
        assert len(standard_templates) == 1
        assert standard_templates[0]["team"] == "team1"

        even_odd_templates = list(
            self.repo.collection.find({"template_type": "even_odd"})
        )
        assert len(even_odd_templates) == 1
        assert even_odd_templates[0]["team"] == "team2"
