"""Pure builder functions that construct NotificationEvent instances.

Each function is a side-effect-free factory — it only assembles data and
returns a NotificationEvent that can be passed to NotificationService.dispatch().
"""

from shared.schemas.core.notification import NotificationEvent, NotificationType


def team_invite_received_event(
    team_id: str,
    team_name: str,
    sender_name: str,
    invited_user_id: str,
) -> NotificationEvent:
    """Notify the invited user that someone sent them a team invitation."""
    return NotificationEvent(
        notification_type=NotificationType.TEAM_INVITE_RECEIVED,
        user_ids=[invited_user_id],
        team_id=team_id,
        event_data={"team_name": team_name, "sender_name": sender_name},
    )


def team_invite_accepted_event(
    team_id: str,
    team_name: str,
    accepted_user_name: str,
    owner_user_ids: list[str],
) -> NotificationEvent:
    """Notify team owners that a user accepted their invitation."""
    return NotificationEvent(
        notification_type=NotificationType.TEAM_INVITE_ACCEPTED,
        user_ids=owner_user_ids,
        team_id=team_id,
        event_data={"team_name": team_name, "accepted_user_name": accepted_user_name},
    )


def member_removed_event(
    team_id: str,
    team_name: str,
    removed_user_id: str,
) -> NotificationEvent:
    """Notify a user that they have been removed from a team."""
    return NotificationEvent(
        notification_type=NotificationType.MEMBER_REMOVED,
        user_ids=[removed_user_id],
        team_id=team_id,
        event_data={"team_name": team_name},
    )


def member_left_event(
    team_id: str,
    team_name: str,
    member_name: str,
    owner_user_ids: list[str],
) -> NotificationEvent:
    """Notify team owners that a member voluntarily left the team."""
    return NotificationEvent(
        notification_type=NotificationType.MEMBER_LEFT,
        user_ids=owner_user_ids,
        team_id=team_id,
        event_data={"team_name": team_name, "member_name": member_name},
    )
