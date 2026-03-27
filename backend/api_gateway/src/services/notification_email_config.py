"""Notification email configuration: maps NotificationType → email template/type/path."""

from typing import Any, Dict

from shared.schemas.core import User
from shared.schemas.core.email import EmailType
from shared.schemas.core.notification import NotificationType

# Maps each NotificationType to (template_name, EmailType, app_path_suffix).
# Adding a new type requires only one new row here and two template files.
NOTIFICATION_EMAIL_MAP: dict[NotificationType, tuple[str, EmailType, str]] = {
    NotificationType.SCHEDULE_PUBLISHED: (
        "notification_schedule_published_email",
        EmailType.NOTIFICATION_SCHEDULE_PUBLISHED,
        "/plan/schedule",
    ),
    NotificationType.NEW_SWAP_REQUEST: (
        "notification_new_swap_request_email",
        EmailType.NOTIFICATION_SWAP_REQUEST,
        "/plan/swaps",
    ),
    NotificationType.SWAP_STATUS_CHANGED: (
        "notification_swap_status_changed_email",
        EmailType.NOTIFICATION_SWAP_STATUS_CHANGED,
        "/plan/swaps",
    ),
    NotificationType.REQUEST_STATUS_CHANGED: (
        "notification_request_status_changed_email",
        EmailType.NOTIFICATION_REQUEST_DECISION,
        "/plan/requests",
    ),
    NotificationType.ASSIGNMENT_CHANGED: (
        "notification_assignment_changed_email",
        EmailType.NOTIFICATION_ASSIGNMENT_CHANGED,
        "/plan/schedule",
    ),
    NotificationType.USER_RECEIVED_TEAM_INVITE: (
        "notification_user_received_team_invite_email",
        EmailType.NOTIFICATION_USER_RECEIVED_TEAM_INVITE,
        "/plan/settings/teams",
    ),
    NotificationType.USER_ACCEPTED_TEAM_INVITE: (
        "notification_user_accepted_team_invite_email",
        EmailType.NOTIFICATION_USER_ACCEPTED_TEAM_INVITE,
        "/plan/settings/teams",
    ),
    NotificationType.USER_REMOVED_FROM_TEAM: (
        "notification_user_removed_from_team_email",
        EmailType.NOTIFICATION_USER_REMOVED_FROM_TEAM,
        "/plan",
    ),
    NotificationType.USER_LEFT_TEAM: (
        "notification_user_left_team_email",
        EmailType.NOTIFICATION_USER_LEFT_TEAM,
        "/plan/settings/teams",
    ),
}

# Subjects keyed by (NotificationType, language).
NOTIFICATION_SUBJECTS: dict[tuple[NotificationType, str], str] = {
    # English
    (NotificationType.SCHEDULE_PUBLISHED, "en"): "Your schedule has been published",
    (NotificationType.NEW_SWAP_REQUEST, "en"): "New swap request",
    (NotificationType.SWAP_STATUS_CHANGED, "en"): "Your swap request status changed",
    (NotificationType.REQUEST_STATUS_CHANGED, "en"): "Your request has been updated",
    (NotificationType.ASSIGNMENT_CHANGED, "en"): "Your assignment has been changed",
    (
        NotificationType.USER_RECEIVED_TEAM_INVITE,
        "en",
    ): "You've been invited to join a team",
    (
        NotificationType.USER_ACCEPTED_TEAM_INVITE,
        "en",
    ): "A user accepted your team invitation",
    (
        NotificationType.USER_REMOVED_FROM_TEAM,
        "en",
    ): "You have been removed from a team",
    (NotificationType.USER_LEFT_TEAM, "en"): "A user has left your team",
    # Spanish
    (NotificationType.SCHEDULE_PUBLISHED, "es"): "Tu horario ha sido publicado",
    (NotificationType.NEW_SWAP_REQUEST, "es"): "Nueva solicitud de cambio",
    (NotificationType.SWAP_STATUS_CHANGED, "es"): "El estado de tu cambio ha cambiado",
    (NotificationType.REQUEST_STATUS_CHANGED, "es"): "Tu solicitud ha sido actualizada",
    (NotificationType.ASSIGNMENT_CHANGED, "es"): "Tu asignación ha sido modificada",
    (
        NotificationType.USER_RECEIVED_TEAM_INVITE,
        "es",
    ): "Has sido invitado a unirte a un equipo",
    (
        NotificationType.USER_ACCEPTED_TEAM_INVITE,
        "es",
    ): "Un usuario aceptó tu invitación al equipo",
    (NotificationType.USER_REMOVED_FROM_TEAM, "es"): "Has sido eliminado de un equipo",
    (NotificationType.USER_LEFT_TEAM, "es"): "Un usuario ha abandonado tu equipo",
    # French
    (NotificationType.SCHEDULE_PUBLISHED, "fr"): "Votre planning a été publié",
    (NotificationType.NEW_SWAP_REQUEST, "fr"): "Nouvelle demande d'échange",
    (NotificationType.SWAP_STATUS_CHANGED, "fr"): "Le statut de votre échange a changé",
    (NotificationType.REQUEST_STATUS_CHANGED, "fr"): "Votre demande a été mise à jour",
    (NotificationType.ASSIGNMENT_CHANGED, "fr"): "Votre affectation a été modifiée",
    (
        NotificationType.USER_RECEIVED_TEAM_INVITE,
        "fr",
    ): "Vous avez été invité à rejoindre une équipe",
    (
        NotificationType.USER_ACCEPTED_TEAM_INVITE,
        "fr",
    ): "Un utilisateur a accepté votre invitation",
    (
        NotificationType.USER_REMOVED_FROM_TEAM,
        "fr",
    ): "Vous avez été retiré d'une équipe",
    (NotificationType.USER_LEFT_TEAM, "fr"): "Un utilisateur a quitté votre équipe",
}


def build_email_context(
    notification_type: NotificationType,
    event_data: Dict[str, Any],
    user: User,
    link: str,
    subject: str,
) -> Dict[str, Any]:
    """Build the template context dict, merging standard fields with event_data."""
    return {
        "recipient_name": user.first_name,
        "notification_link": link,
        "subject": subject,
        **event_data,
    }
