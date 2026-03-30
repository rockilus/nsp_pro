"""Pure builder functions that construct NotificationEvent instances.

Each function is a side-effect-free factory — it only assembles data and
returns a NotificationEvent that can be passed to NotificationService.dispatch().
"""

from shared.schemas.core.notification import (
    NotificationEvent,
    NotificationType,
)

# pylint: disable=too-many-arguments


def user_received_team_invite_event(
    team_id: str,
    team_name: str,
    sender_name: str,
    invited_user_id: str,
) -> NotificationEvent:
    """Notify the invited user that someone sent them a team invitation."""
    return NotificationEvent(
        notification_type=NotificationType.USER_RECEIVED_TEAM_INVITE,
        user_ids=[invited_user_id],
        team_id=team_id,
        event_data={"team_name": team_name, "sender_name": sender_name},
    )


def user_accepted_team_invite_event(
    team_id: str,
    team_name: str,
    accepted_user_name: str,
    inviter_user_id: str,
) -> NotificationEvent:
    """Notify the invitation sender that the recipient accepted."""
    return NotificationEvent(
        notification_type=NotificationType.USER_ACCEPTED_TEAM_INVITE,
        user_ids=[inviter_user_id],
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "accepted_user_name": accepted_user_name,
        },
    )


def user_removed_from_team_event(
    team_id: str,
    team_name: str,
    removed_user_id: str,
) -> NotificationEvent:
    """Notify a user that they have been removed from a team."""
    return NotificationEvent(
        notification_type=NotificationType.USER_REMOVED_FROM_TEAM,
        user_ids=[removed_user_id],
        team_id=team_id,
        event_data={"team_name": team_name},
    )


def user_left_team_event(
    team_id: str,
    team_name: str,
    user_name: str,
    owner_user_ids: list[str],
) -> NotificationEvent:
    """Notify team owners that a member voluntarily left the team."""
    return NotificationEvent(
        notification_type=NotificationType.USER_LEFT_TEAM,
        user_ids=owner_user_ids,
        team_id=team_id,
        event_data={"team_name": team_name, "user_name": user_name},
    )


def new_request_created_event(
    team_id: str,
    team_name: str,
    worker_name: str,
    start_date: str,
    manager_user_ids: list[str],
) -> NotificationEvent:
    """Notify team managers that a new request has been created."""
    return NotificationEvent(
        notification_type=NotificationType.NEW_REQUEST,
        user_ids=manager_user_ids,
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "worker_name": worker_name,
            "start_date": start_date,
        },
    )


def request_status_changed_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    request_id: str,
    new_status: str,
    shift_name: str,
    start_date: str,
) -> NotificationEvent:
    """Notify the request creator that their request status has changed."""
    return NotificationEvent(
        notification_type=NotificationType.REQUEST_STATUS_CHANGED,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "request_id": request_id,
            "new_status": new_status,
            "shift_name": shift_name,
            "date": start_date,
            "team_name": team_name,
        },
    )
