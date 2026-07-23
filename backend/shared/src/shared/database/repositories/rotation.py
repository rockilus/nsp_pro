from datetime import date, datetime, time, timezone
from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.rotation import RotationSchema
from shared.schemas.core.rotation import Rotation


class RotationRepository(BaseRepository[RotationSchema]):
    """Repository for rotation rules using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "rotations", RotationSchema)

    def create_rotation(self, rotation: Rotation) -> Rotation:
        rotation_schema = RotationSchema.from_core(rotation)
        result = self.create(rotation_schema)
        return result.to_core()

    def get_rotation_by_id(self, rotation_id: str) -> Rotation:
        rotation = self.find_by_id(rotation_id)
        if not rotation:
            raise Exception(f"Rotation with id {rotation_id} not found")
        return rotation.to_core()

    def get_rotations_by_team_id(self, team_id: str) -> List[Rotation]:
        rotations = self.find_all({"team_id": team_id})
        return [r.to_core() for r in rotations]

    def get_rotations_by_shift_and_date_range(
        self, shift_id: str, start_date: date, end_date: date
    ) -> List[Rotation]:
        """Get rotations for a specific shift that overlap with the given date range.
        Used for overlap validation."""
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()
        query = {
            "shift_id": shift_id,
            "start_date": {"$lte": end_timestamp},
            "$or": [
                {"end_date": {"$gte": start_timestamp}},
                {"end_date": None},
            ],
        }
        rotations = self.find_all(query)
        return [r.to_core() for r in rotations]

    def get_rotations_by_team_and_date_range(
        self, team_id: str, start_date: date, end_date: date
    ) -> List[Rotation]:
        """Get all rotations for a team that overlap with the given date range."""
        start_timestamp = datetime.combine(
            start_date, time.min, timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(end_date, time.max, timezone.utc).timestamp()
        query = {
            "team_id": team_id,
            "start_date": {"$lte": end_timestamp},
            "$or": [
                {"end_date": {"$gte": start_timestamp}},
                {"end_date": None},
            ],
        }
        rotations = self.find_all(query)
        return [r.to_core() for r in rotations]

    def update_rotation(self, rotation: Rotation) -> Rotation:
        rotation_schema = RotationSchema.from_core(rotation)
        updated = self.update(rotation_schema)
        if not updated:
            raise Exception(f"Failed to update rotation with id {rotation.id}")
        return updated.to_core()

    def update_rotation_watermark(
        self, rotation_id: str, last_materialized_until: date
    ) -> None:
        timestamp = datetime.combine(
            last_materialized_until, time.min, timezone.utc
        ).timestamp()
        self.collection.update_one(
            {"_id": rotation_id},
            {"$set": {"last_materialized_until": timestamp}},
        )

    def delete_rotation(self, rotation_id: str) -> None:
        result = self.delete(rotation_id)
        if not result:
            raise Exception(
                f"Rotation with id {rotation_id} not found or already deleted"
            )
