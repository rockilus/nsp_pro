from datetime import datetime, timezone
from typing import List, Optional

import pytest

from shared.database.repositories.multitasking import (
    MultitaskingGroupRepository,
)
from shared.schemas.core.multitasking import (
    MultitaskingGroup,
    MultitaskingGroupType,
)


class TestMultitaskingGroupRepository:
    """Test suite for MultitaskingGroupRepository."""

    repo: MultitaskingGroupRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        assert mongodb_container is not None
        self.repo = MultitaskingGroupRepository()
        # Optionally clear the collection before each test
        self.repo.collection.delete_many({})

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    def _create_test_group(
        self,
        team_id: str = "team1",
        group_type: MultitaskingGroupType = MultitaskingGroupType.SHIFT_DEMAND,
        related_ids: Optional[List[str]] = None,
        shift_demand_template_id: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> MultitaskingGroup:
        if related_ids is None:
            related_ids = ["rel1", "rel2"]
        now = datetime.now(timezone.utc)
        return MultitaskingGroup(
            id=None,
            type=group_type,
            team_id=team_id,
            related_ids=related_ids,
            shift_demand_template_id=shift_demand_template_id,
            created_at=now,
            updated_at=now,
            notes=notes,
        )

    def test_create_group(self):
        group = self._create_test_group()
        result = self.repo.create_group(group)
        assert result.id is not None
        assert result.team_id == "team1"
        assert set(result.related_ids) == {"rel1", "rel2"}
        assert result.type == MultitaskingGroupType.SHIFT_DEMAND
        assert result.created_at is not None
        assert result.updated_at is not None
        # Verify in DB
        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team_id"] == "team1"
        assert set(saved_doc["related_ids"]) == {"rel1", "rel2"}

    def test_create_group_with_template_id_and_notes(self):
        group = self._create_test_group(
            group_type=MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE,
            shift_demand_template_id="template123",
            notes="Important group",
        )
        result = self.repo.create_group(group)
        assert result.shift_demand_template_id == "template123"
        assert result.notes == "Important group"
        assert result.type == MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE

    def test_get_group_by_id(self):
        group = self._create_test_group()
        created = self.repo.create_group(group)
        result = self.repo.get_group_by_id(created.id)
        assert result is not None
        assert result.id == created.id
        assert result.team_id == created.team_id
        assert set(result.related_ids) == set(created.related_ids)

    def test_get_group_by_id_not_found(self):
        result = self.repo.get_group_by_id("nonexistent")
        assert result is None

    def test_get_groups_by_team_id(self):
        group1 = self._create_test_group(
            team_id="team1", related_ids=["a", "b"]
        )
        group2 = self._create_test_group(
            team_id="team1", related_ids=["c", "d"]
        )
        group3 = self._create_test_group(
            team_id="team2", related_ids=["e", "f"]
        )
        self.repo.create_group(group1)
        self.repo.create_group(group2)
        self.repo.create_group(group3)
        result = self.repo.get_groups_by_team_id("team1")
        assert len(result) == 2
        assert all(g.team_id == "team1" for g in result)

    def test_update_group(self):
        group = self._create_test_group(notes="initial")
        created = self.repo.create_group(group)
        created.notes = "updated"
        created.related_ids.append("rel3")
        created.updated_at = datetime.now(timezone.utc)
        result = self.repo.update_group(created)
        assert result.notes == "updated"
        assert "rel3" in result.related_ids
        assert result.updated_at > result.created_at
        # Verify in DB
        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc["notes"] == "updated"
        assert "rel3" in saved_doc["related_ids"]

    def test_update_group_not_found(self):
        group = self._create_test_group()
        group.id = "nonexistent"
        with pytest.raises(ValueError):
            self.repo.update_group(group)

    def test_delete_group(self):
        group = self._create_test_group()
        created = self.repo.create_group(group)
        deleted = self.repo.delete_group(created.id)
        assert deleted is True
        # Verify not in DB
        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_delete_group_not_found(self):
        deleted = self.repo.delete_group("nonexistent")
        assert deleted is False

    def test_get_groups_by_template_id(self):
        group1 = self._create_test_group(
            group_type=MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE,
            shift_demand_template_id="template1",
        )
        group2 = self._create_test_group(
            group_type=MultitaskingGroupType.SHIFT_DEMAND_TEMPLATE,
            shift_demand_template_id="template2",
        )
        self.repo.create_group(group1)
        self.repo.create_group(group2)
        result = self.repo.get_groups_by_template_id("template1")
        assert len(result) == 1
        assert result[0].shift_demand_template_id == "template1"

    def test_get_groups_by_related_id(self):
        group1 = self._create_test_group(related_ids=["a", "b"])
        group2 = self._create_test_group(related_ids=["b", "c"])
        group3 = self._create_test_group(related_ids=["d", "e"])
        self.repo.create_group(group1)
        self.repo.create_group(group2)
        self.repo.create_group(group3)
        result = self.repo.get_groups_by_related_id("b")
        assert len(result) == 2
        assert all("b" in g.related_ids for g in result)

    def test_related_ids_validation(self):
        # Should raise if less than 2 unique related_ids
        with pytest.raises(ValueError):
            self._create_test_group(related_ids=["onlyone"])

    def test_type_validation(self):
        with pytest.raises(ValueError):
            MultitaskingGroup(
                id=None,
                type="invalid_type",  # type: ignore
                team_id="team1",
                related_ids=["a", "b"],
                shift_demand_template_id=None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                notes=None,
            )
