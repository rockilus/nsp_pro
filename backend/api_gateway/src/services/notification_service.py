"""Notification service for creating and managing user notifications."""

from dataclasses import dataclass
from datetime import date as date_type
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from loguru import logger
from shared.schemas.core import (
    Assignment,
    Request,
    Schedule,
    ScheduleStatus,
    SwapRequest,
    SwapType,
    TeamMembershipRole,
)
from shared.schemas.core.notification import (
    Notification,
    NotificationEvent,
    NotificationType,
)
from shared.schemas.core.notification_preferences import NotificationKey

from src.config import config
from src.services.base_service import BaseService
from src.services.notification_builders import (
    user_accepted_request_event,
    user_created_assignment_event,
    user_created_request_event,
    user_deleted_assignment_event,
    user_denied_request_event,
    user_published_schedule_event,
    user_updated_assignment_event,
)
from src.services.notification_email_config import (
    NOTIFICATION_EMAIL_MAP,
    NOTIFICATION_SUBJECTS,
    build_email_context,
)

if TYPE_CHECKING:
    from src.services.email_queue_service import EmailQueueService

# pylint: disable=too-many-locals

# Maps each NotificationType to a NotificationKey that controls it.
# Types absent from this map are always delivered (fail-open).
_NOTIFICATION_TYPE_TO_KEY: dict[NotificationType, NotificationKey] = {
    NotificationType.USER_PUBLISHED_SCHEDULE: NotificationKey.USER_PUBLISHED_SCHEDULE,
    NotificationType.USER_CREATED_REQUEST: NotificationKey.USER_CREATED_REQUEST,
    NotificationType.NEW_SWAP_REQUEST: NotificationKey.SWAP_REQUESTS,
    NotificationType.SWAP_STATUS_CHANGED: NotificationKey.SWAP_REQUESTS,
    NotificationType.USER_ACCEPTED_REQUEST: NotificationKey.USER_ACCEPTED_REQUEST,
    NotificationType.USER_DENIED_REQUEST: NotificationKey.USER_DENIED_REQUEST,
    NotificationType.USER_CREATED_ASSIGNMENT: NotificationKey.ASSIGNMENT_CHANGES,
    NotificationType.USER_UPDATED_ASSIGNMENT: NotificationKey.ASSIGNMENT_CHANGES,
    NotificationType.USER_DELETED_ASSIGNMENT: NotificationKey.ASSIGNMENT_CHANGES,
    # fmt: off
    NotificationType.USER_RECEIVED_TEAM_INVITE: (
        NotificationKey.USER_RECEIVED_TEAM_INVITE
        ),
    NotificationType.USER_ACCEPTED_TEAM_INVITE: (
        NotificationKey.USER_ACCEPTED_TEAM_INVITE
        ),
    # fmt: on
    NotificationType.USER_REMOVED_FROM_TEAM: NotificationKey.USER_REMOVED_FROM_TEAM,
    NotificationType.USER_LEFT_TEAM: NotificationKey.USER_LEFT_TEAM,
}


@dataclass
class AssignmentOperation:
    """Represents a single assignment CRUD operation with before/after state."""

    before: Optional[Assignment]  # None for create
    after: Optional[Assignment]  # None for delete


class NotificationService(BaseService):
    """Service for managing in-app notifications."""

    def __init__(
        self,
        collection,
        email_queue_service: "EmailQueueService | None" = None,
    ) -> None:
        super().__init__(collection)
        self.email_queue_service = email_queue_service

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

    def get_unseen_count(self, user_id: str) -> int:
        return self.collection.notification_db.get_unseen_count(user_id)

    def mark_all_seen(self, user_id: str) -> None:
        self.collection.notification_db.mark_all_seen(user_id)

    def mark_read_where_seen_before(
        self, user_id: str, before: datetime
    ) -> int:
        return self.collection.notification_db.mark_read_where_seen_before(
            user_id, before
        )

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

    async def dispatch(self, event: NotificationEvent) -> None:
        """Dispatch a NotificationEvent to all target users (fire-and-forget)."""
        pref_key = _NOTIFICATION_TYPE_TO_KEY.get(event.notification_type)
        for user_id in event.user_ids:
            try:
                prefs = None
                if pref_key is not None:
                    try:
                        # fmt: off
                        prefs = self.collection.notification_preferences_db\
                            .get_or_create_default(
                                user_id
                            )
                        # fmt: on
                        channel = prefs.preferences.get(pref_key)
                        if channel is not None and not channel.in_app:
                            logger.debug(
                                f"Skipping {event.notification_type} notification "
                                f"for user {user_id}: inApp preference is disabled"
                            )
                            continue
                    except (
                        Exception
                    ) as pref_exc:  # pylint: disable=broad-except
                        logger.warning(
                            f"Could not fetch preferences for user {user_id}, "
                            f"defaulting to send: {pref_exc}"
                        )
                self.create_notification(
                    user_id,
                    event.team_id,
                    event.notification_type,
                    event.event_data,
                )
                await self._try_send_email(
                    user_id=user_id,
                    pref_key=pref_key,
                    prefs=prefs,
                    event=event,
                )
            except Exception as e:  # pylint: disable=broad-except
                logger.error(
                    f"Failed to dispatch {event.notification_type} notification "
                    f"to user {user_id}: {e}"
                )

    async def _try_send_email(
        self,
        user_id: str,
        pref_key: NotificationKey | None,
        prefs: Any,
        event: NotificationEvent,
    ) -> None:
        """Send a notification email if conditions are met. Never raises."""
        try:
            if config.environment != "production":
                return
            if self.email_queue_service is None:
                return
            entry = NOTIFICATION_EMAIL_MAP.get(event.notification_type)
            if entry is None:
                return
            if pref_key is not None and prefs is not None:
                channel = prefs.preferences.get(pref_key)
                if channel is not None and not channel.email:
                    return
            user = self.collection.user_db.get_user_by_id(user_id)
            if not user or not user.email:
                return
            template_name, email_type, app_path_suffix = entry
            language = user.language.value if user.language else "en"
            link = config.client_url + f"/{language}" + app_path_suffix
            subject = NOTIFICATION_SUBJECTS.get(
                (event.notification_type, language),
                NOTIFICATION_SUBJECTS.get((event.notification_type, "en"), ""),
            )
            context = build_email_context(
                event_data=event.event_data,
                user=user,
                link=link,
                subject=subject,
            )
            await self.email_queue_service.enqueue_notification(
                to_address=user.email,
                template_name=template_name,
                email_type=email_type,
                context=context,
                language=language,
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send notification email for "
                f"{event.notification_type} to user {user_id}: {e}"
            )

    async def notify_schedule_published(self, schedule: Schedule) -> None:
        """Notify all team workers that a schedule has been published."""
        try:
            team = self.collection.team_db.get_team_by_id(schedule.team_id)
            team_name = team.name if team else ""
            workers = self.collection.worker_db.get_workers_not_deleted(
                schedule.team_id
            )
            worker_user_ids = [w.user_id for w in workers if w.user_id]
            if not worker_user_ids:
                return
            schedule_name = f"{schedule.start_date} \u2013 {schedule.end_date}"
            event = user_published_schedule_event(
                team_id=schedule.team_id,
                team_name=team_name,
                schedule_id=schedule.id,
                schedule_name=schedule_name,
                worker_user_ids=worker_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send schedule-published notifications: {e}"
            )

    def _is_assignment_in_published_period(
        self, assignment_date: date_type, team_id: str
    ) -> bool:
        """Return True if the assignment date is in a published (validated) period.

        Logic:
        - If a schedule covers the date and status != VALIDATED → suppress.
        - If no schedule covers the date → notify (outside any campaign).
        - If a schedule covers the date and status == VALIDATED → notify.
        """
        try:
            schedules = self.collection.schedule_db.get_schedules(team_id)
            for schedule in schedules:
                if schedule.start_date <= assignment_date <= schedule.end_date:
                    if schedule.status != ScheduleStatus.VALIDATED:
                        return False
                    return True
            # No schedule covers this date — treat as always published
            return True
        except Exception as e:  # pylint: disable=broad-except
            logger.warning(
                f"Could not check schedule status for date {assignment_date}: {e}"
            )
            return True  # Fail-open

    async def notify_assignment_crud(
        self,
        ops: List["AssignmentOperation"],
        team_id: str,
    ) -> None:
        """Dispatch create/update/delete notifications for a list of assignment ops."""
        try:
            team = self.collection.team_db.get_team_by_id(team_id)
            team_name = team.name if team else ""

            # Accumulate events keyed by (user_id, NotificationType) for dedup.
            pending: dict[tuple[str, NotificationType], NotificationEvent] = {}

            for op in ops:
                events = self._build_assignment_op_events(
                    op, team_id, team_name
                )
                for event in events:
                    for user_id in event.user_ids:
                        key = (user_id, event.notification_type)
                        if key not in pending:
                            # Store a single-user copy for dispatch
                            pending[key] = NotificationEvent(
                                notification_type=event.notification_type,
                                user_ids=[user_id],
                                team_id=team_id,
                                event_data=event.event_data,
                            )

            for event in pending.values():
                await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send assignment CRUD notifications: {e}")

    # pylint: disable=too-many-branches,too-many-return-statements
    def _build_assignment_op_events(
        self,
        op: "AssignmentOperation",
        team_id: str,
        team_name: str,
    ) -> List[NotificationEvent]:  # pylint: disable=too-many-return-statements
        """Return the NotificationEvents for a single AssignmentOperation."""
        events: List[NotificationEvent] = []

        if op.before is None and op.after is not None:
            # Create
            if not self._is_assignment_in_published_period(
                op.after.date, team_id
            ):
                return events
            worker = self.collection.worker_db.get_worker_by_id(
                op.after.worker_id
            )
            if not worker or not worker.user_id:
                return events
            shift = self.collection.shift_db.get_shift_by_id(op.after.shift_id)
            shift_name = shift.name if shift else ""
            events.append(
                user_created_assignment_event(
                    team_id=team_id,
                    team_name=team_name,
                    worker_user_id=worker.user_id,
                    shift_name=shift_name,
                    date=str(op.after.date),
                )
            )

        elif op.after is None and op.before is not None:
            # Delete
            if not self._is_assignment_in_published_period(
                op.before.date, team_id
            ):
                return events
            worker = self.collection.worker_db.get_worker_by_id(
                op.before.worker_id
            )
            if not worker or not worker.user_id:
                return events
            shift = self.collection.shift_db.get_shift_by_id(
                op.before.shift_id
            )
            shift_name = shift.name if shift else ""
            events.append(
                user_deleted_assignment_event(
                    team_id=team_id,
                    team_name=team_name,
                    worker_user_id=worker.user_id,
                    shift_name=shift_name,
                    date=str(op.before.date),
                )
            )

        elif op.before is not None and op.after is not None:
            # Update — check what actually changed
            worker_changed = op.before.worker_id != op.after.worker_id
            shift_changed = op.before.shift_id != op.after.shift_id
            date_changed = op.before.date != op.after.date

            if worker_changed:
                # Treated as delete-for-old + create-for-new
                if self._is_assignment_in_published_period(
                    op.after.date, team_id
                ):
                    old_worker = self.collection.worker_db.get_worker_by_id(
                        op.before.worker_id
                    )
                    new_worker = self.collection.worker_db.get_worker_by_id(
                        op.after.worker_id
                    )
                    shift = self.collection.shift_db.get_shift_by_id(
                        op.after.shift_id
                    )
                    shift_name = shift.name if shift else ""
                    if old_worker and old_worker.user_id:
                        events.append(
                            user_deleted_assignment_event(
                                team_id=team_id,
                                team_name=team_name,
                                worker_user_id=old_worker.user_id,
                                shift_name=shift_name,
                                date=str(op.after.date),
                            )
                        )
                    if new_worker and new_worker.user_id:
                        events.append(
                            user_created_assignment_event(
                                team_id=team_id,
                                team_name=team_name,
                                worker_user_id=new_worker.user_id,
                                shift_name=shift_name,
                                date=str(op.after.date),
                            )
                        )
            elif shift_changed or date_changed:
                if not self._is_assignment_in_published_period(
                    op.after.date, team_id
                ):
                    return events
                worker = self.collection.worker_db.get_worker_by_id(
                    op.after.worker_id
                )
                if not worker or not worker.user_id:
                    return events
                shift = self.collection.shift_db.get_shift_by_id(
                    op.after.shift_id
                )
                shift_name = shift.name if shift else ""
                events.append(
                    user_updated_assignment_event(
                        team_id=team_id,
                        team_name=team_name,
                        worker_user_id=worker.user_id,
                        shift_name=shift_name,
                        date=str(op.after.date),
                    )
                )
            # else: only non-schedule fields changed (e.g. fixed) — no notification

        return events

    async def notify_new_swap_request(self, swap: SwapRequest) -> None:
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
            notify_user_ids: list[str] = []
            if swap.swap_type == SwapType.DIRECT and swap.target_worker_id:
                target_worker = self.collection.worker_db.get_worker_by_id(
                    swap.target_worker_id
                )
                if target_worker and target_worker.user_id:
                    notify_user_ids.append(target_worker.user_id)
            memberships = self.collection.team_membership_db.get_team_memberships_by_team_id(
                swap.team_id
            )
            owner_user_ids = [
                m.user_id
                for m in memberships
                if getattr(m, "role", None) in ("manager", "owner", "admin")
                and m.user_id
            ]
            notify_user_ids.extend(owner_user_ids)
            pref_key = _NOTIFICATION_TYPE_TO_KEY.get(
                NotificationType.NEW_SWAP_REQUEST
            )
            for user_id in notify_user_ids:
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
                await self._try_send_email(
                    user_id=user_id,
                    pref_key=pref_key,
                    prefs=None,
                    event=NotificationEvent(
                        notification_type=NotificationType.NEW_SWAP_REQUEST,
                        user_ids=[user_id],
                        team_id=swap.team_id,
                        event_data=event_data,
                    ),
                )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-request notifications: {e}")

    async def notify_user_accepted_request(self, request: Request) -> None:
        """Notify the worker whose request was approved."""
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
            event = user_accepted_request_event(
                team_id=request.team_id,
                team_name=team_name,
                worker_user_id=worker.user_id,
                request_id=request.id,
                shift_name=shift_name,
                start_date=str(request.start_date),
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send user-accepted-request notification: {e}"
            )

    async def notify_user_denied_request(self, request: Request) -> None:
        """Notify the worker whose request was denied."""
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
            event = user_denied_request_event(
                team_id=request.team_id,
                team_name=team_name,
                worker_user_id=worker.user_id,
                request_id=request.id,
                shift_name=shift_name,
                start_date=str(request.start_date),
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send user-denied-request notification: {e}"
            )

    async def notify_user_created_request(self, request: Request) -> None:
        """Notify team managers that a new request has been created."""
        try:
            worker = self.collection.worker_db.get_worker_by_id(
                request.worker_id
            )
            worker_name = worker.name if worker else ""
            team = self.collection.team_db.get_team_by_id(request.team_id)
            team_name = team.name if team else ""
            memberships = self.collection.team_membership_db.get_team_memberships_by_team_id(
                request.team_id
            )
            manager_user_ids = [
                m.user_id
                for m in memberships
                if m.role == TeamMembershipRole.OWNER and m.user_id
            ]
            if not manager_user_ids:
                return
            event = user_created_request_event(
                team_id=request.team_id,
                team_name=team_name,
                worker_name=worker_name,
                start_date=str(request.start_date),
                manager_user_ids=manager_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send new-request-created notification: {e}"
            )
