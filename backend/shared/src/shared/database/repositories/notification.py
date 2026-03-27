"""Repository for Notification documents."""

from datetime import datetime, timezone
from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.notification import NotificationSchema
from shared.schemas.core.notification import Notification


class NotificationRepository(BaseRepository[NotificationSchema]):
    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "notifications", NotificationSchema)

    def create_notification(self, notification: Notification) -> Notification:
        schema = NotificationSchema.from_core(notification)
        created = self.create(schema)
        return created.to_core()

    def get_by_user_id(
        self, user_id: str, limit: int = 20, skip: int = 0
    ) -> List[Notification]:
        schemas = self.find_all(
            {"user_id": user_id},
            limit=limit,
            skip=skip,
        )
        # Sort descending by created_at in Python (collection can have index)
        schemas.sort(key=lambda s: s.created_at, reverse=True)
        return [s.to_core() for s in schemas]

    def get_unread_count(self, user_id: str) -> int:
        return self.count({"user_id": user_id, "read": False})

    def mark_read(self, notification_id: str) -> Optional[Notification]:
        schema = self.find_by_id(notification_id)
        if schema is None:
            return None
        now = datetime.now(timezone.utc)
        schema.read = True
        schema.read_at = now
        schema.updated_at = now
        updated = self.update(schema)
        return updated.to_core() if updated else None

    def mark_all_read(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        self.collection.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": now, "updated_at": now}},
        )

    def delete_notification(self, notification_id: str) -> bool:
        return self.delete(notification_id)

    def get_unseen_count(self, user_id: str) -> int:
        return self.count({"user_id": user_id, "seen_at": None})

    def mark_seen(self, notification_id: str) -> Optional[Notification]:
        schema = self.find_by_id(notification_id)
        if schema is None or schema.seen_at is not None:
            return schema.to_core() if schema else None
        now = datetime.now(timezone.utc)
        schema.seen_at = now
        schema.updated_at = now
        updated = self.update(schema)
        return updated.to_core() if updated else None

    def mark_all_seen(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        self.collection.update_many(
            {"user_id": user_id, "seen_at": None},
            {"$set": {"seen_at": now, "updated_at": now}},
        )

    def mark_read_where_seen_before(self, user_id: str, before: datetime) -> int:
        now = datetime.now(timezone.utc)
        result = self.collection.update_many(
            {
                "user_id": user_id,
                "read": False,
                "seen_at": {"$ne": None, "$lte": before},
            },
            {"$set": {"read": True, "read_at": now, "updated_at": now}},
        )
        return result.modified_count
