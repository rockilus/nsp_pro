"""Pure builder functions that construct NotificationEvent instances.

Each function is a side-effect-free factory — it only assembles data and
returns a NotificationEvent that can be passed to NotificationService.dispatch().
"""

from shared.schemas.core.notification import (
    NotificationEvent,
    NotificationType,
)

# pylint: disable=too-many-arguments


def user_published_schedule_event(
    team_id: str,
    team_name: str,
    schedule_id: str,
    start_date: str,
    end_date: str,
    worker_user_ids: list[str],
) -> NotificationEvent:
    """Notify workers that a schedule has been published."""
    return NotificationEvent(
        notification_type=NotificationType.USER_PUBLISHED_SCHEDULE,
        user_ids=worker_user_ids,
        team_id=team_id,
        event_data={
            "schedule_id": schedule_id,
            "start_date": start_date,
            "end_date": end_date,
            "team_name": team_name,
        },
    )


def user_created_assignment_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    shift_name: str,
    date: str,
) -> NotificationEvent:
    """Notify a worker that an assignment was created for them."""
    return NotificationEvent(
        notification_type=NotificationType.USER_CREATED_ASSIGNMENT,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_updated_assignment_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    shift_name: str,
    date: str,
) -> NotificationEvent:
    """Notify a worker that their assignment was updated."""
    return NotificationEvent(
        notification_type=NotificationType.USER_UPDATED_ASSIGNMENT,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_deleted_assignment_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    shift_name: str,
    date: str,
) -> NotificationEvent:
    """Notify a worker that their assignment was deleted."""
    return NotificationEvent(
        notification_type=NotificationType.USER_DELETED_ASSIGNMENT,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


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


def user_created_request_event(
    team_id: str,
    team_name: str,
    worker_name: str,
    start_date: str,
    manager_user_ids: list[str],
) -> NotificationEvent:
    """Notify team managers that a new request has been created."""
    return NotificationEvent(
        notification_type=NotificationType.USER_CREATED_REQUEST,
        user_ids=manager_user_ids,
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "worker_name": worker_name,
            "start_date": start_date,
        },
    )


def user_accepted_request_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    request_id: str,
    shift_name: str,
    start_date: str,
) -> NotificationEvent:
    """Notify the request creator that their request was approved."""
    return NotificationEvent(
        notification_type=NotificationType.USER_ACCEPTED_REQUEST,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "request_id": request_id,
            "shift_name": shift_name,
            "date": start_date,
            "team_name": team_name,
        },
    )


def user_denied_request_event(
    team_id: str,
    team_name: str,
    worker_user_id: str,
    request_id: str,
    shift_name: str,
    start_date: str,
) -> NotificationEvent:
    """Notify the request creator that their request was denied."""
    return NotificationEvent(
        notification_type=NotificationType.USER_DENIED_REQUEST,
        user_ids=[worker_user_id],
        team_id=team_id,
        event_data={
            "request_id": request_id,
            "shift_name": shift_name,
            "date": start_date,
            "team_name": team_name,
        },
    )


# ---------------------------------------------------------------------------
# Swap notification builders
# ---------------------------------------------------------------------------


def user_created_direct_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    requester_name: str,
    shift_name: str,
    date: str,
    target_user_id: str,
) -> NotificationEvent:
    """Notify the target worker that a direct swap was created for them."""
    return NotificationEvent(
        notification_type=NotificationType.USER_CREATED_DIRECT_SWAP,
        user_ids=[target_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "requester_name": requester_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_accepted_direct_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    target_name: str,
    shift_name: str,
    date: str,
    creator_user_id: str,
) -> NotificationEvent:
    """Notify the swap creator that the target accepted their direct swap."""
    return NotificationEvent(
        notification_type=NotificationType.USER_ACCEPTED_DIRECT_SWAP,
        user_ids=[creator_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "target_name": target_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_refused_direct_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    refuser_name: str,
    shift_name: str,
    date: str,
    creator_user_id: str,
) -> NotificationEvent:
    """Notify the swap creator that the target refused their direct swap."""
    return NotificationEvent(
        notification_type=NotificationType.USER_REFUSED_DIRECT_SWAP,
        user_ids=[creator_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "refuser_name": refuser_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_created_open_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    requester_name: str,
    shift_name: str,
    date: str,
    team_member_user_ids: list[str],
) -> NotificationEvent:
    """Notify all team members (except creator) that an open swap was created."""
    return NotificationEvent(
        notification_type=NotificationType.USER_CREATED_OPEN_SWAP,
        user_ids=team_member_user_ids,
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "requester_name": requester_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_bid_open_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    bidder_name: str,
    shift_name: str,
    date: str,
    creator_user_id: str,
) -> NotificationEvent:
    """Notify the swap creator that someone bid on their open swap."""
    return NotificationEvent(
        notification_type=NotificationType.USER_BID_OPEN_SWAP,
        user_ids=[creator_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "bidder_name": bidder_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_selected_bid_open_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    requester_name: str,
    shift_name: str,
    date: str,
    accepted_bidder_user_id: str,
) -> NotificationEvent:
    """Notify the accepted bidder that their bid was selected."""
    return NotificationEvent(
        notification_type=NotificationType.USER_SELECTED_BID_OPEN_SWAP,
        user_ids=[accepted_bidder_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "requester_name": requester_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_selected_other_bid_open_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    shift_name: str,
    date: str,
    other_bidder_user_ids: list[str],
) -> NotificationEvent:
    """Notify non-selected bidders that a different bid was chosen."""
    return NotificationEvent(
        notification_type=NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP,
        user_ids=other_bidder_user_ids,
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def swap_ready_for_review_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    requester_name: str,
    shift_name: str,
    date: str,
    swap_type: str,
    manager_user_ids: list[str],
) -> NotificationEvent:
    """Notify team managers/owners that a swap is ready for review."""
    return NotificationEvent(
        notification_type=NotificationType.SWAP_READY_FOR_REVIEW,
        user_ids=manager_user_ids,
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "requester_name": requester_name,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
            "swap_type": swap_type,
        },
    )


def user_validated_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    own_shift_name: str,
    own_date: str,
    other_shift_name: str,
    other_date: str,
    party_user_id: str,
) -> NotificationEvent:
    """Notify one swap party that the swap was validated."""
    return NotificationEvent(
        notification_type=NotificationType.USER_VALIDATED_SWAP,
        user_ids=[party_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "own_shift_name": own_shift_name,
            "own_date": own_date,
            "other_shift_name": other_shift_name,
            "other_date": other_date,
            "team_name": team_name,
        },
    )


def user_denied_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    shift_name: str,
    date: str,
    party_user_ids: list[str],
) -> NotificationEvent:
    """Notify both swap parties that the swap was denied."""
    return NotificationEvent(
        notification_type=NotificationType.USER_DENIED_SWAP,
        user_ids=party_user_ids,
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "shift_name": shift_name,
            "date": date,
            "team_name": team_name,
        },
    )


def user_reversed_swap_event(
    team_id: str,
    team_name: str,
    swap_id: str,
    own_shift_name: str,
    own_date: str,
    other_shift_name: str,
    other_date: str,
    party_user_id: str,
) -> NotificationEvent:
    """Notify one swap party that the swap was reversed."""
    return NotificationEvent(
        notification_type=NotificationType.USER_REVERSED_SWAP,
        user_ids=[party_user_id],
        team_id=team_id,
        event_data={
            "swap_id": swap_id,
            "own_shift_name": own_shift_name,
            "own_date": own_date,
            "other_shift_name": other_shift_name,
            "other_date": other_date,
            "team_name": team_name,
        },
    )


# ---------------------------------------------------------------------------
# Campaign request deadline notification builders
# ---------------------------------------------------------------------------


def campaign_request_deadline_set_event(
    team_id: str,
    team_name: str,
    deadline_date: str,
    schedule_start: str,
    schedule_end: str,
    member_user_ids: list[str],
) -> NotificationEvent:
    """Notify members that the team leader has set a request deadline."""
    return NotificationEvent(
        notification_type=NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET,
        user_ids=member_user_ids,
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "deadline_date": deadline_date,
            "schedule_start_date": schedule_start,
            "schedule_end_date": schedule_end,
        },
    )


def campaign_request_deadline_reminder_event(
    team_id: str,
    team_name: str,
    deadline_date: str,
    schedule_start: str,
    schedule_end: str,
    member_user_ids: list[str],
) -> NotificationEvent:
    """Remind members to submit their requests before the deadline."""
    return NotificationEvent(
        notification_type=NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER,
        user_ids=member_user_ids,
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "deadline_date": deadline_date,
            "schedule_start_date": schedule_start,
            "schedule_end_date": schedule_end,
        },
    )


def campaign_request_deadline_updated_event(
    team_id: str,
    team_name: str,
    old_deadline_date: str,
    new_deadline_date: str,
    schedule_start: str,
    schedule_end: str,
    member_user_ids: list[str],
) -> NotificationEvent:
    """Notify members that the request deadline has been extended."""
    return NotificationEvent(
        notification_type=NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED,
        user_ids=member_user_ids,
        team_id=team_id,
        event_data={
            "team_name": team_name,
            "old_deadline_date": old_deadline_date,
            "new_deadline_date": new_deadline_date,
            "schedule_start_date": schedule_start,
            "schedule_end_date": schedule_end,
        },
    )
