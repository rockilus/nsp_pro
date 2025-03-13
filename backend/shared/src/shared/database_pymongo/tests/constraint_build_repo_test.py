import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.constraint_build import (
    ConstraintBuildRepository,
)
from shared.database_pymongo.schemas.constraint_build import (
    BlockSchema,
    ConstraintBuildSchema,
)
from shared.schemas.schemas.constraint import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuild,
    ConstraintType,
)


class TestConstraintBuildRepository:
    repo: ConstraintBuildRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ConstraintBuildRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_constraint_build(self):
        """Test creating a constraint build."""
        constraint_build = ConstraintBuild(
            id=None,
            team_id="team1",
            constraint_type=ConstraintType.SUM,
            template_id="template1",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value=">=",
                )
            ],
            hard=True,
            priority="high",
        )

        result = self.repo.create_constraint_build(constraint_build)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.constraint_type == ConstraintType.SUM

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["constraint_type"] == ConstraintType.SUM.value

    def test_get_constraint_build_by_id(self):
        """Test getting a constraint build by ID."""
        constraint_build = ConstraintBuildSchema(
            team="team1",
            constraint_type=ConstraintType.SUM.value,
            template_id="template1",
            language="en",
            blocks=[
                BlockSchema(
                    name=BlockNameOptions.OPERATOR.value,
                    type=BlockTypeOptions.STRING.value,
                    value=">=",
                )
            ],
            hard=True,
            priority="high",
        )
        created = self.repo.create(constraint_build)

        found = self.repo.get_constraint_build_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_constraint_build(self):
        """Test updating a constraint build."""
        constraint_build = ConstraintBuildSchema(
            team="team1",
            constraint_type=ConstraintType.SUM.value,
            template_id="template1",
            language="en",
            blocks=[
                BlockSchema(
                    name=BlockNameOptions.OPERATOR.value,
                    type=BlockTypeOptions.STRING.value,
                    value=">=",
                )
            ],
            hard=True,
            priority="high",
        )
        created = self.repo.create(constraint_build)

        updated_constraint_build = ConstraintBuild(
            id=created.id,
            team_id="team1",
            constraint_type=ConstraintType.ORD,
            template_id="template2",
            language="fr",
            blocks=[
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=5,
                )
            ],
            hard=False,
            priority="low",
        )

        result = self.repo.update_constraint_build(updated_constraint_build)

        assert result.constraint_type == ConstraintType.ORD
        assert result.template_id == "template2"
        assert result.language == "fr"

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["constraint_type"] == ConstraintType.ORD.value
        assert from_db["template_id"] == "template2"
        assert from_db["language"] == "fr"

    def test_delete_constraint_build(self):
        """Test deleting a constraint build."""
        constraint_build = ConstraintBuildSchema(
            team="team1",
            constraint_type=ConstraintType.SUM.value,
            template_id="template1",
            language="en",
            blocks=[
                BlockSchema(
                    name=BlockNameOptions.OPERATOR.value,
                    type=BlockTypeOptions.STRING.value,
                    value=">=",
                )
            ],
            hard=True,
            priority="high",
        )
        created = self.repo.create(constraint_build)

        self.repo.delete_constraint_build(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_constraint_builds(self):
        """Test getting all constraint builds for a team."""
        constraint_builds = [
            ConstraintBuildSchema(
                team="team1",
                constraint_type=ConstraintType.SUM.value,
                template_id="template1",
                language="en",
                blocks=[
                    BlockSchema(
                        name=BlockNameOptions.OPERATOR.value,
                        type=BlockTypeOptions.STRING.value,
                        value=">=",
                    )
                ],
                hard=True,
                priority="high",
            ),
            ConstraintBuildSchema(
                team="team1",
                constraint_type=ConstraintType.ORD.value,
                template_id="template2",
                language="fr",
                blocks=[
                    BlockSchema(
                        name=BlockNameOptions.NUMBER.value,
                        type=BlockTypeOptions.NUMBER.value,
                        value=5,
                    )
                ],
                hard=False,
                priority="low",
            ),
        ]
        self.repo.create_many(constraint_builds)

        results = self.repo.get_constraint_builds("team1")

        assert len(results) == 2
        assert results[0].team_id == "team1"
        assert results[1].team_id == "team1"

    def test_get_constraint_builds_by_ids(self):
        """Test getting multiple constraint builds by their IDs."""
        constraint_builds = [
            ConstraintBuildSchema(
                team="team1",
                constraint_type=ConstraintType.SUM.value,
                template_id="template1",
                language="en",
                blocks=[
                    BlockSchema(
                        name=BlockNameOptions.OPERATOR.value,
                        type=BlockTypeOptions.STRING.value,
                        value=">=",
                    )
                ],
                hard=True,
                priority="high",
            ),
            ConstraintBuildSchema(
                team="team1",
                constraint_type=ConstraintType.ORD.value,
                template_id="template2",
                language="fr",
                blocks=[
                    BlockSchema(
                        name=BlockNameOptions.NUMBER.value,
                        type=BlockTypeOptions.NUMBER.value,
                        value=5,
                    )
                ],
                hard=False,
                priority="low",
            ),
        ]
        created = self.repo.create_many(constraint_builds)
        ids = [cb.id for cb in created]

        results = self.repo.get_constraint_builds_by_ids(ids)

        assert len(results) == 2
        assert results[0].id in ids
        assert results[1].id in ids
