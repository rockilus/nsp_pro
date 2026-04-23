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
    campaign_request_deadline_reminder_event,
    campaign_request_deadline_set_event,
    campaign_request_deadline_updated_event,
    swap_ready_for_review_event,
    user_accepted_direct_swap_event,
    user_accepted_request_event,
    user_bid_open_swap_event,
    user_created_assignment_event,
    user_created_direct_swap_event,
    user_created_open_swap_event,
    user_created_request_event,
    user_deleted_assignment_event,
    user_denied_request_event,
    user_denied_swap_event,
    user_published_schedule_event,
    user_refused_direct_swap_event,
    user_reversed_swap_event,
    user_selected_bid_open_swap_event,
    user_selected_other_bid_open_swap_event,
    user_updated_assignment_event,
    user_validated_swap_event,
)
from src.services.notification_email_config import (
    NOTIFICATION_EMAIL_MAP,
    NOTIFICATION_SUBJECTS,
    build_email_context,
)

if TYPE_CHECKING:
    from src.services.email_queue_service import EmailQueueService

# pylint: disable=too-many-locals, too-many-lines, too-many-arguments

# Maps each NotificationType to a NotificationKey that controls it.
# Types absent from this map are always delivered (fail-open).
_NOTIFICATION_TYPE_TO_KEY: dict[NotificationType, NotificationKey] = {
    NotificationType.USER_PUBLISHED_SCHEDULE: NotificationKey.USER_PUBLISHED_SCHEDULE,
    NotificationType.USER_CREATED_REQUEST: NotificationKey.USER_CREATED_REQUEST,
    NotificationType.USER_ACCEPTED_REQUEST: NotificationKey.USER_ACCEPTED_REQUEST,
    NotificationType.USER_DENIED_REQUEST: NotificationKey.USER_DENIED_REQUEST,
    NotificationType.USER_CREATED_ASSIGNMENT: NotificationKey.USER_CREATED_ASSIGNMENT,
    NotificationType.USER_UPDATED_ASSIGNMENT: NotificationKey.USER_UPDATED_ASSIGNMENT,
    NotificationType.USER_DELETED_ASSIGNMENT: NotificationKey.USER_DELETED_ASSIGNMENT,
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
    # Swap notification types
    NotificationType.USER_CREATED_DIRECT_SWAP: (
        NotificationKey.USER_CREATED_DIRECT_SWAP
    ),
    NotificationType.USER_ACCEPTED_DIRECT_SWAP: (
        NotificationKey.USER_ACCEPTED_DIRECT_SWAP
    ),
    NotificationType.USER_REFUSED_DIRECT_SWAP: (
        NotificationKey.USER_REFUSED_DIRECT_SWAP
    ),
    NotificationType.USER_CREATED_OPEN_SWAP: (NotificationKey.USER_CREATED_OPEN_SWAP),
    NotificationType.USER_BID_OPEN_SWAP: NotificationKey.USER_BID_OPEN_SWAP,
    NotificationType.USER_SELECTED_BID_OPEN_SWAP: (
        NotificationKey.USER_SELECTED_BID_OPEN_SWAP
    ),
    NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP: (
        NotificationKey.USER_SELECTED_OTHER_BID_OPEN_SWAP
    ),
    NotificationType.SWAP_READY_FOR_REVIEW: NotificationKey.SWAP_READY_FOR_REVIEW,
    NotificationType.USER_VALIDATED_SWAP: NotificationKey.USER_VALIDATED_SWAP,
    NotificationType.USER_DENIED_SWAP: NotificationKey.USER_DENIED_SWAP,
    NotificationType.USER_REVERSED_SWAP: NotificationKey.USER_REVERSED_SWAP,
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET: (
        NotificationKey.CAMPAIGN_REQUEST_DEADLINE_SET
    ),
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER: (
        NotificationKey.CAMPAIGN_REQUEST_DEADLINE_REMINDER
    ),
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED: (
        NotificationKey.CAMPAIGN_REQUEST_DEADLINE_UPDATED
    ),
}


@dataclass
class AssignmentOperation:
    """Represents a single assignment CRUD operation with before/after state."""

    before: Optional[Assignment]  # None for create
    after: Optional[Assignment]  # None for delete


class NotificationService(BaseService):  # pylint: disable=too-many-public-methods
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
            return self.collection.notification_db.create_notification(notification)
        except Exception as e:
            logger.error(f"Failed to create notification for user {user_id}: {e}")
            raise

    def get_user_notifications(
        self, user_id: str, limit: int = 20, skip: int = 0
    ) -> Dict[str, Any]:
        """Return paginated notifications + unread count."""
        notifications = self.collection.notification_db.get_by_user_id(
            user_id, limit=limit, skip=skip
        )
        unread_count = self.collection.notification_db.get_unread_count(user_id)
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

    def mark_read_where_seen_before(self, user_id: str, before: datetime) -> int:
        return self.collection.notification_db.mark_read_where_seen_before(
            user_id, before
        )

    def mark_read(self, notification_id: str, user_id: str) -> Optional[Notification]:
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
        return self.collection.notification_db.delete_notification(notification_id)

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
                    except Exception as pref_exc:  # pylint: disable=broad-except
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
            event = user_published_schedule_event(
                team_id=schedule.team_id,
                team_name=team_name,
                schedule_id=schedule.id,
                start_date=schedule.start_date.isoformat(),
                end_date=schedule.end_date.isoformat(),
                worker_user_ids=worker_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send schedule-published notifications: {e}")

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
                events = self._build_assignment_op_events(op, team_id, team_name)
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
            if not self._is_assignment_in_published_period(op.after.date, team_id):
                return events
            worker = self.collection.worker_db.get_worker_by_id(op.after.worker_id)
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
            if not self._is_assignment_in_published_period(op.before.date, team_id):
                return events
            worker = self.collection.worker_db.get_worker_by_id(op.before.worker_id)
            if not worker or not worker.user_id:
                return events
            shift = self.collection.shift_db.get_shift_by_id(op.before.shift_id)
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
                if self._is_assignment_in_published_period(op.after.date, team_id):
                    old_worker = self.collection.worker_db.get_worker_by_id(
                        op.before.worker_id
                    )
                    new_worker = self.collection.worker_db.get_worker_by_id(
                        op.after.worker_id
                    )
                    shift = self.collection.shift_db.get_shift_by_id(op.after.shift_id)
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
                if not self._is_assignment_in_published_period(op.after.date, team_id):
                    return events
                worker = self.collection.worker_db.get_worker_by_id(op.after.worker_id)
                if not worker or not worker.user_id:
                    return events
                shift = self.collection.shift_db.get_shift_by_id(op.after.shift_id)
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

    async def notify_swap_created(self, swap: SwapRequest) -> None:
        """Dispatch user_created_direct_swap or user_created_open_swap."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            offering_worker = (
                self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
                if swap.offering_worker_id
                else None
            )
            requester_name = offering_worker.name if offering_worker else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)

            if swap.swap_type == SwapType.DIRECT and swap.target_worker_id:
                target_worker = self.collection.worker_db.get_worker_by_id(
                    swap.target_worker_id
                )
                if target_worker and target_worker.user_id:
                    event = user_created_direct_swap_event(
                        team_id=swap.team_id,
                        team_name=team_name,
                        swap_id=swap.id,
                        requester_name=requester_name,
                        shift_name=shift_name,
                        date=first_date,
                        target_user_id=target_worker.user_id,
                    )
                    await self.dispatch(event)
            else:
                # OPEN swap — notify all team members except the creator
                creator_user_id = offering_worker.user_id if offering_worker else None
                mem_db = self.collection.team_membership_db
                memberships = mem_db.get_team_memberships_by_team_id(swap.team_id)
                member_user_ids = [
                    m.user_id
                    for m in memberships
                    if m.user_id and m.user_id != creator_user_id
                ]
                if member_user_ids:
                    event = user_created_open_swap_event(
                        team_id=swap.team_id,
                        team_name=team_name,
                        swap_id=swap.id,
                        requester_name=requester_name,
                        shift_name=shift_name,
                        date=first_date,
                        team_member_user_ids=member_user_ids,
                    )
                    await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-created notifications: {e}")

    async def notify_direct_swap_accepted(self, swap: SwapRequest) -> None:
        """Dispatch user_accepted_direct_swap + swap_ready_for_review."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            target_worker = (
                self.collection.worker_db.get_worker_by_id(swap.target_worker_id)
                if swap.target_worker_id
                else None
            )
            target_name = target_worker.name if target_worker else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)

            # Notify creator
            offering_worker = (
                self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
                if swap.offering_worker_id
                else None
            )
            if offering_worker and offering_worker.user_id:
                event = user_accepted_direct_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    target_name=target_name,
                    shift_name=shift_name,
                    date=first_date,
                    creator_user_id=offering_worker.user_id,
                )
                await self.dispatch(event)

            # Notify managers/owners
            offering_name = offering_worker.name if offering_worker else ""
            await self._dispatch_swap_ready_for_review(
                swap=swap,
                team_name=team_name,
                requester_name=offering_name,
                shift_name=shift_name,
                date=first_date,
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send direct-swap-accepted notifications: {e}")

    async def notify_direct_swap_refused(self, swap: SwapRequest) -> None:
        """Dispatch user_refused_direct_swap to the creator."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            target_worker = (
                self.collection.worker_db.get_worker_by_id(swap.target_worker_id)
                if swap.target_worker_id
                else None
            )
            refuser_name = target_worker.name if target_worker else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)

            offering_worker = (
                self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
                if swap.offering_worker_id
                else None
            )
            if offering_worker and offering_worker.user_id:
                event = user_refused_direct_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    refuser_name=refuser_name,
                    shift_name=shift_name,
                    date=first_date,
                    creator_user_id=offering_worker.user_id,
                )
                await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send direct-swap-refused notifications: {e}")

    async def notify_bid_added(self, swap: SwapRequest, bidder_worker_id: str) -> None:
        """Dispatch user_bid_open_swap to the swap creator."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            bidder_worker = self.collection.worker_db.get_worker_by_id(bidder_worker_id)
            bidder_name = bidder_worker.name if bidder_worker else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)

            offering_worker = (
                self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
                if swap.offering_worker_id
                else None
            )
            if offering_worker and offering_worker.user_id:
                event = user_bid_open_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    bidder_name=bidder_name,
                    shift_name=shift_name,
                    date=first_date,
                    creator_user_id=offering_worker.user_id,
                )
                await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send bid-added notifications: {e}")

    async def notify_bid_accepted(
        self, swap: SwapRequest, accepted_bid_worker_id: str
    ) -> None:
        """Dispatch selected/other-bid notifications + swap_ready_for_review."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            offering_worker = (
                self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
                if swap.offering_worker_id
                else None
            )
            requester_name = offering_worker.name if offering_worker else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)

            # Notify accepted bidder
            accepted_worker = self.collection.worker_db.get_worker_by_id(
                accepted_bid_worker_id
            )
            if accepted_worker and accepted_worker.user_id:
                event = user_selected_bid_open_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    requester_name=requester_name,
                    shift_name=shift_name,
                    date=first_date,
                    accepted_bidder_user_id=accepted_worker.user_id,
                )
                await self.dispatch(event)

            # Notify other (non-accepted) bidders
            other_bidder_user_ids: list[str] = []
            for bid in swap.bids:
                if bid.worker_id == accepted_bid_worker_id:
                    continue
                w = self.collection.worker_db.get_worker_by_id(bid.worker_id)
                if w and w.user_id:
                    other_bidder_user_ids.append(w.user_id)
            if other_bidder_user_ids:
                other_event = user_selected_other_bid_open_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    shift_name=shift_name,
                    date=first_date,
                    other_bidder_user_ids=other_bidder_user_ids,
                )
                await self.dispatch(other_event)

            # Notify managers/owners
            await self._dispatch_swap_ready_for_review(
                swap=swap,
                team_name=team_name,
                requester_name=requester_name,
                shift_name=shift_name,
                date=first_date,
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send bid-accepted notifications: {e}")

    async def notify_swap_validated(self, swap: SwapRequest) -> None:
        """Dispatch user_validated_swap to both swap parties."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            await self._dispatch_swap_party_events(
                swap=swap,
                event_factory=lambda pid, os, od, xs, xd: user_validated_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    own_shift_name=os,
                    own_date=od,
                    other_shift_name=xs,
                    other_date=xd,
                    party_user_id=pid,
                ),
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-validated notifications: {e}")

    async def notify_swap_denied(self, swap: SwapRequest) -> None:
        """Dispatch user_denied_swap to both swap parties."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            shift_name, first_date = self._get_swap_shift_and_date(swap)
            party_user_ids = self._get_swap_party_user_ids(swap)
            if party_user_ids:
                event = user_denied_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    shift_name=shift_name,
                    date=first_date,
                    party_user_ids=party_user_ids,
                )
                await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-denied notifications: {e}")

    async def notify_swap_reversed(self, swap: SwapRequest) -> None:
        """Dispatch user_reversed_swap to both swap parties."""
        try:
            team = self.collection.team_db.get_team_by_id(swap.team_id)
            team_name = team.name if team else ""
            await self._dispatch_swap_party_events(
                swap=swap,
                event_factory=lambda pid, os, od, xs, xd: user_reversed_swap_event(
                    team_id=swap.team_id,
                    team_name=team_name,
                    swap_id=swap.id,
                    own_shift_name=os,
                    own_date=od,
                    other_shift_name=xs,
                    other_date=xd,
                    party_user_id=pid,
                ),
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Failed to send swap-reversed notifications: {e}")

    # ------------------------------------------------------------------
    # Private swap helpers
    # ------------------------------------------------------------------

    def _get_swap_shift_and_date(self, swap: SwapRequest) -> tuple[str, str]:
        """Return (shift_name, date_str) from the first offered assignment."""
        shift_name = ""
        first_date = ""
        if swap.offered_assignment_ids:
            assignment = self.collection.assignment_db.get_assignment_by_id(
                swap.offered_assignment_ids[0]
            )
            if assignment:
                first_date = str(assignment.date)
                shift = self.collection.shift_db.get_shift_by_id(assignment.shift_id)
                if shift:
                    shift_name = shift.name
        return shift_name, first_date

    def _get_swap_party_user_ids(self, swap: SwapRequest) -> list[str]:
        """Return user IDs for the offering worker and target worker."""
        user_ids: list[str] = []
        if swap.offering_worker_id:
            w = self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
            if w and w.user_id:
                user_ids.append(w.user_id)
        if swap.target_worker_id:
            w = self.collection.worker_db.get_worker_by_id(swap.target_worker_id)
            if w and w.user_id and w.user_id not in user_ids:
                user_ids.append(w.user_id)
        return user_ids

    async def _dispatch_swap_ready_for_review(  # pylint: disable=too-many-arguments
        self,
        swap: SwapRequest,
        team_name: str,
        requester_name: str,
        shift_name: str,
        date: str,
    ) -> None:
        """Send swap_ready_for_review to all team managers/owners."""
        mem_db = self.collection.team_membership_db
        memberships = mem_db.get_team_memberships_by_team_id(swap.team_id)
        manager_user_ids = [
            m.user_id
            for m in memberships
            if m.role == TeamMembershipRole.OWNER and m.user_id
        ]
        if manager_user_ids:
            event = swap_ready_for_review_event(
                team_id=swap.team_id,
                team_name=team_name,
                swap_id=swap.id,
                requester_name=requester_name,
                shift_name=shift_name,
                date=date,
                swap_type=swap.swap_type.value,
                manager_user_ids=manager_user_ids,
            )
            await self.dispatch(event)

    async def _dispatch_swap_party_events(
        self,
        swap: SwapRequest,
        event_factory,
    ) -> None:
        """Send per-party events (validated/reversed) to each swap participant."""
        # Gather assignment info for both parties
        offered_assignment = None
        requested_assignment = None
        if swap.offered_assignment_ids:
            offered_assignment = self.collection.assignment_db.get_assignment_by_id(
                swap.offered_assignment_ids[0]
            )
        if swap.requested_assignment_ids:
            requested_assignment = self.collection.assignment_db.get_assignment_by_id(
                swap.requested_assignment_ids[0]
            )

        def _shift_name_for(assignment) -> str:
            if not assignment:
                return ""
            shift = self.collection.shift_db.get_shift_by_id(assignment.shift_id)
            return shift.name if shift else ""

        offered_shift = _shift_name_for(offered_assignment)
        offered_date = str(offered_assignment.date) if offered_assignment else ""
        requested_shift = _shift_name_for(requested_assignment)
        requested_date = str(requested_assignment.date) if requested_assignment else ""

        # Notify offering worker: their own shift is offered, other is requested
        if swap.offering_worker_id:
            w = self.collection.worker_db.get_worker_by_id(swap.offering_worker_id)
            if w and w.user_id:
                event = event_factory(
                    w.user_id,
                    offered_shift,
                    offered_date,
                    requested_shift,
                    requested_date,
                )
                await self.dispatch(event)

        # Notify target worker: their own shift is requested, other is offered
        if swap.target_worker_id:
            w = self.collection.worker_db.get_worker_by_id(swap.target_worker_id)
            if w and w.user_id:
                event = event_factory(
                    w.user_id,
                    requested_shift,
                    requested_date,
                    offered_shift,
                    offered_date,
                )
                await self.dispatch(event)

    async def notify_user_accepted_request(self, request: Request) -> None:
        """Notify the worker whose request was approved."""
        try:
            worker = self.collection.worker_db.get_worker_by_id(request.worker_id)
            if not worker or not worker.user_id:
                return
            team = self.collection.team_db.get_team_by_id(request.team_id)
            team_name = team.name if team else ""
            shift_name = ""
            if request.shift_id:
                shift = self.collection.shift_db.get_shift_by_id(request.shift_id)
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
            logger.error(f"Failed to send user-accepted-request notification: {e}")

    async def notify_user_denied_request(self, request: Request) -> None:
        """Notify the worker whose request was denied."""
        try:
            worker = self.collection.worker_db.get_worker_by_id(request.worker_id)
            if not worker or not worker.user_id:
                return
            team = self.collection.team_db.get_team_by_id(request.team_id)
            team_name = team.name if team else ""
            shift_name = ""
            if request.shift_id:
                shift = self.collection.shift_db.get_shift_by_id(request.shift_id)
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
            logger.error(f"Failed to send user-denied-request notification: {e}")

    async def notify_user_created_request(self, request: Request) -> None:
        """Notify team managers that a new request has been created."""
        try:
            worker = self.collection.worker_db.get_worker_by_id(request.worker_id)
            worker_name = worker.name if worker else ""
            team = self.collection.team_db.get_team_by_id(request.team_id)
            team_name = team.name if team else ""
            mem_db = self.collection.team_membership_db
            memberships = mem_db.get_team_memberships_by_team_id(request.team_id)
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
            logger.error(f"Failed to send new-request-created notification: {e}")

    async def notify_campaign_request_deadline_set(
        self,
        team_id: str,
        team_name: str,
        deadline_date: str,
        schedule_start: str,
        schedule_end: str,
        member_user_ids: list[str],
    ) -> None:
        """Notify members that the team leader has set a request deadline."""
        try:
            event = campaign_request_deadline_set_event(
                team_id=team_id,
                team_name=team_name,
                deadline_date=deadline_date,
                schedule_start=schedule_start,
                schedule_end=schedule_end,
                member_user_ids=member_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send campaign-request-deadline-set notification: {e}"
            )

    async def notify_campaign_request_deadline_reminder(
        self,
        team_id: str,
        team_name: str,
        deadline_date: str,
        schedule_start: str,
        schedule_end: str,
        member_user_ids: list[str],
    ) -> None:
        """Remind members to submit their requests before the deadline."""
        try:
            event = campaign_request_deadline_reminder_event(
                team_id=team_id,
                team_name=team_name,
                deadline_date=deadline_date,
                schedule_start=schedule_start,
                schedule_end=schedule_end,
                member_user_ids=member_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send campaign-request-deadline-reminder notification: {e}"
            )

    async def notify_campaign_request_deadline_updated(
        self,
        team_id: str,
        team_name: str,
        old_deadline_date: str,
        new_deadline_date: str,
        schedule_start: str,
        schedule_end: str,
        member_user_ids: list[str],
    ) -> None:
        """Notify members that the request deadline has been extended."""
        try:
            event = campaign_request_deadline_updated_event(
                team_id=team_id,
                team_name=team_name,
                old_deadline_date=old_deadline_date,
                new_deadline_date=new_deadline_date,
                schedule_start=schedule_start,
                schedule_end=schedule_end,
                member_user_ids=member_user_ids,
            )
            await self.dispatch(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                f"Failed to send campaign-request-deadline-updated notification: {e}"
            )
