from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.team_generation_settings import (
    TeamGenerationSettingsSchema,
)
from shared.schemas.core.team_generation_settings import TeamGenerationSettings


class TeamGenerationSettingsRepository(BaseRepository[TeamGenerationSettingsSchema]):
    """Repository for team generation settings documents."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "team_generation_settings",
            TeamGenerationSettingsSchema,
        )

    def get_by_team_id(self, team_id: str) -> TeamGenerationSettings | None:
        """Return settings for a team, or None if no document exists."""
        doc = self.find_one({"team_id": team_id})
        if doc is None:
            return None
        return doc.to_core()

    def upsert(self, settings: TeamGenerationSettings) -> TeamGenerationSettings:
        """Upsert settings for a team. Creates on first call, updates on subsequent calls."""
        update_data = {
            "duty_scope_work_time": settings.duty_scope_work_time,
            "duty_consecutive_gap_mode": settings.duty_consecutive_gap_mode,
            "duty_consecutive_gap_days": settings.duty_consecutive_gap_days,
        }
        self.collection.update_one(
            {"team_id": settings.team_id},
            {"$set": update_data, "$setOnInsert": {"team_id": settings.team_id}},
            upsert=True,
        )
        result = self.get_by_team_id(settings.team_id)
        assert result is not None
        return result
