"""Notification service for creating and managing user notifications."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger
from shared.schemas.core import (
    Assignment,
    Request,
    Schedule,
    SwapRequest,
    SwapType,
)
from shared.schemas.core.notification import (
    Notification,
    NotificationEvent,
    NotificationType,
)

from src.services.base_service import BaseService


class NotificationService(BaseService):
    """Service for managing in-app notifications."""

    def create_notification(
        self,
        user_id: str,
        team_id: str,
        notification_type: NotificationType,
        event_data: Dict[str, Any],
    ) -> Notification:
        """Create a notification in DB. Fire-and-forget — does not raise."""
        try:
            now = datetime.now(timezone.utc)
            notification = Notification(
                id="",
                user_id=user_id,
                team_id=team_id,
                type=notification_type,
                event_data=event_data,
                read=False,
                created_at=now,
                updated_at=now,
            )
            return self.collection.notification_db.create_notification(
                notification
            )
        except Exception as e:
            logger.error(
                f"Failed to create notification for user {user_id}: {e}"
            )
            raise

    def get_user_notifications(
        self, user_id: str, limit: int = 20, skip: int = 0
    ) -> Dict[str, Any]:
        """Return paginated notifications + unread count."""
        notifications = self.collection.notification_db.get_by_user_id(
            user_id, limit=limit, skip=skip
        )
        unread_count = self.collection.notification_db.get_unread_count(
            user_id
        )
        return {
            "notifications": notifications,
            "unread_count": unread_count,
        }

    def get_unread_count(self, user_id: str) -> int:
        return self.collection.notification_db.get_unread_count(user_id)

    def mark_read(
        self, notification_id: str, user_id: str
    ) -> Optional[Notification]:
        """Mark a notification as read, verifying ownership."""
        schema = self.collection.notification_db.find_by_id(notification_id)
        if schema is None:
            return None
        if schema.user_id != user_id:
            raise PermissionError("Notification does not belong to this user")
        return self.collection.notification_db.mark_read(notification_id)

    def mark_all_read(self, user_id: str) -> None:
        self.collection.notification_db.mark_all_read(user_id)

    def delete(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification, verifying ownership."""
        schema = self.collection.notification_db.find_by_id(notification_id)
        if schema is None:
            return False
        if schema.user_id != user_id:
            raise PermissionError("Notification does not belong to this user")
        return self.collection.notification_db.delete_notification(
            notification_id
        )

    # ------------------------------------------------------------------
    # Domain notify methods (fire-and-forget, never raise)
    # ------------------------------------------------------------------

    def dispatch(self, event: NotificationEvent) -> None:
        """Dispatch a NotificationEvent to all target users (fire-and-forget)."""
        for user_id in event.user_ids:
            try:
                self.create_notification(
                    user_id,
                    event.team_id,
                    event.notification_type,
                    event.event_data,
                )
            except Exception as e:  # pylint: disable=broad-except
                logger.error(
                    f"Failed to dispatch {event.notification_type} notification "
                    f"to user {user_id}: {e}"
                )

    def notify_schedule_published(self, schedule: Schedule) -> None:
        """Notify all team workers that a schedule has been published."""
        try:
            team = self.collection.team_db.get_team_by_id(schedule.team_id)
            team_name = team.name if team else ""
            workers = self.collection.worker_db.get_workers_not_deleted(
                schedule.team_id
            )
            now = datetime.now(timezone.utc)
            for worker in workers:
                if not worker.user_id:
                    continue
                self.collection.notification_db.create_notification(
                    Notification(
                        id="",
                        user_id=worker.user_id,
                        team_id=schedule.team_id,
                        type=NotificationType.SCHEDULE_PUBLISHED,
                        event_data={
                            "schedule_id": schedule.id,
                            "schedule_name": f"{schedule.start_date} – "
                            + f"{schedule.end_date}",
                            "team_name": team_name,
                        },
                        read=False,
                        created_at=now,
                        updated_at=now,
                    )
                )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send schedule-published notifications: {e}"
            )

    def notify_new_swap_request(self, swap: SwapRequest) -> None:
        """Notify target worker (DIRECT) or team managers of a new swap request."""
        try:
            now = datetime.now(timezone.utc)
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            offering_worker = (
                self.collection.worker_db.get_worker_by_id(
                    swap.offering_worker_id
                )
                if swap.offering_worker_id
                else None
            )
            requester_name = offering_worker.name if offering_worker else ""
            first_date = ""
            if swap.offered_assignment_ids:
                first_assignment = (
                    self.collection.assignment_db.get_assignment_by_id(
                        swap.offered_assignment_ids[0]
                    )
                )
                if first_assignment:
                    first_date = str(first_assignment.date)
            event_data = {
                "swap_id": swap.id,
                "requester_name": requester_name,
                "date": first_date,
                "team_name": team_name,
            }
            if swap.swap_type == SwapType.DIRECT and swap.target_worker_id:
                target_worker = self.collection.worker_db.get_worker_by_id(
                    swap.target_worker_id
                )
                if target_worker and target_worker.user_id:
                    self.collection.notification_db.create_notification(
                        Notification(
                            id="",
                            user_id=target_worker.user_id,
                            team_id=swap.team_id,
                            type=NotificationType.NEW_SWAP_REQUEST,
                            event_data=event_data,
                            read=False,
                            created_at=now,
                            updated_at=now,
                        )
                    )
            memberships = self.collection.team_membership_db.get_team_memberships_by_team_id(
                swap.team_id
            )
            owner_user_ids = {
                m.user_id
                for m in memberships
                if getattr(m, "role", None) in ("manager", "owner", "admin")
                and m.user_id
            }
            for user_id in owner_user_ids:
                self.collection.notification_db.create_notification(
                    Notification(
                        id="",
                        user_id=user_id,
                        team_id=swap.team_id,
                        type=NotificationType.NEW_SWAP_REQUEST,
                        event_data=event_data,
                        read=False,
                        created_at=now,
                        updated_at=now,
                    )
                )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-request notifications: {e}")

    def notify_request_status_changed(self, request: Request) -> None:
        """Notify the worker whose request status changed."""
        try:
            worker = self.collection.worker_db.get_worker_by_id(
                request.worker_id
            )
            if not worker or not worker.user_id:
                return
            team = self.collection.team_db.get_team_by_id(request.team_id)
            team_name = team.name if team else ""
            shift_name = ""
            if request.shift_id:
                shift = self.collection.shift_db.get_shift_by_id(
                    request.shift_id
                )
                if shift:
                    shift_name = shift.name
            now = datetime.now(timezone.utc)
            self.collection.notification_db.create_notification(
                Notification(
                    id="",
                    user_id=worker.user_id,
                    team_id=request.team_id,
                    type=NotificationType.REQUEST_STATUS_CHANGED,
                    event_data={
                        "request_id": request.id,
                        "new_status": request.status.value,
                        "shift_name": shift_name,
                        "date": str(request.start_date),
                        "team_name": team_name,
                    },
                    read=False,
                    created_at=now,
                    updated_at=now,
                )
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send request-status-changed notification: {e}"
            )

    def notify_assignment_changed(
        self,
        assignments_updated: List[Assignment],
        team_id: str,
        changed_by_user_id: str,
    ) -> None:
        """Notify each affected worker that their assignment was changed."""
        try:
            now = datetime.now(timezone.utc)
            for updated_assignment in assignments_updated:
                worker = self.collection.worker_db.get_worker_by_id(
                    updated_assignment.worker_id
                )
                if not worker or not worker.user_id:
                    continue
                shift = self.collection.shift_db.get_shift_by_id(
                    updated_assignment.shift_id
                )
                shift_name = shift.name if shift else ""
                self.collection.notification_db.create_notification(
                    Notification(
                        id="",
                        user_id=worker.user_id,
                        team_id=team_id,
                        type=NotificationType.ASSIGNMENT_CHANGED,
                        event_data={
                            "assignment_id": updated_assignment.id,
                            "shift_name": shift_name,
                            "date": str(updated_assignment.date),
                            "changed_by": changed_by_user_id,
                        },
                        read=False,
                        created_at=now,
                        updated_at=now,
                    )
                )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send assignment-changed notifications: {e}"
            )
