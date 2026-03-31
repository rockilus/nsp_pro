"""
Notification email configuration: maps NotificationType → email
template/type/path.
"""

from typing import Any, Dict

from shared.schemas.core import User
from shared.schemas.core.email import EmailType
from shared.schemas.core.notification import NotificationType

# Maps each NotificationType to (template_name, EmailType, app_path_suffix).
# Adding a new type requires only one new row here and two template files.
NOTIFICATION_EMAIL_MAP: dict[NotificationType, tuple[str, EmailType, str]] = {
    NotificationType.USER_PUBLISHED_SCHEDULE: (
        "notification_user_published_schedule_email",
        EmailType.NOTIFICATION_USER_PUBLISHED_SCHEDULE,
        "/plan/schedule",
    ),
    NotificationType.USER_CREATED_REQUEST: (
        "notification_user_created_request_email",
        EmailType.NOTIFICATION_USER_CREATED_REQUEST,
        "/plan/requests",
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
    NotificationType.USER_ACCEPTED_REQUEST: (
        "notification_user_accepted_request_email",
        EmailType.NOTIFICATION_USER_ACCEPTED_REQUEST,
        "/plan/requests",
    ),
    NotificationType.USER_DENIED_REQUEST: (
        "notification_user_denied_request_email",
        EmailType.NOTIFICATION_USER_DENIED_REQUEST,
        "/plan/requests",
    ),
    NotificationType.USER_CREATED_ASSIGNMENT: (
        "notification_user_created_assignment_email",
        EmailType.NOTIFICATION_USER_CREATED_ASSIGNMENT,
        "/plan/schedule",
    ),
    NotificationType.USER_UPDATED_ASSIGNMENT: (
        "notification_user_updated_assignment_email",
        EmailType.NOTIFICATION_USER_UPDATED_ASSIGNMENT,
        "/plan/schedule",
    ),
    NotificationType.USER_DELETED_ASSIGNMENT: (
        "notification_user_deleted_assignment_email",
        EmailType.NOTIFICATION_USER_DELETED_ASSIGNMENT,
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
    (
        NotificationType.USER_PUBLISHED_SCHEDULE,
        "en",
    ): "Your schedule has been published",
    (NotificationType.USER_CREATED_REQUEST, "en"): "New request received",
    (NotificationType.NEW_SWAP_REQUEST, "en"): "New swap request",
    (
        NotificationType.SWAP_STATUS_CHANGED,
        "en",
    ): "Your swap request status changed",
    (
        NotificationType.USER_ACCEPTED_REQUEST,
        "en",
    ): "Your request has been approved",
    (
        NotificationType.USER_DENIED_REQUEST,
        "en",
    ): "Your request has been denied",
    (
        NotificationType.USER_CREATED_ASSIGNMENT,
        "en",
    ): "A new assignment has been added to your schedule",
    (
        NotificationType.USER_UPDATED_ASSIGNMENT,
        "en",
    ): "Your assignment has been updated",
    (
        NotificationType.USER_DELETED_ASSIGNMENT,
        "en",
    ): "Your assignment has been removed from your schedule",
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
    (
        NotificationType.USER_PUBLISHED_SCHEDULE,
        "es",
    ): "Tu horario ha sido publicado",
    (NotificationType.USER_CREATED_REQUEST, "es"): "Nueva solicitud recibida",
    (NotificationType.NEW_SWAP_REQUEST, "es"): "Nueva solicitud de cambio",
    (
        NotificationType.SWAP_STATUS_CHANGED,
        "es",
    ): "El estado de tu cambio ha cambiado",
    (
        NotificationType.USER_ACCEPTED_REQUEST,
        "es",
    ): "Tu solicitud ha sido aprobada",
    (
        NotificationType.USER_DENIED_REQUEST,
        "es",
    ): "Tu solicitud ha sido denegada",
    (
        NotificationType.USER_CREATED_ASSIGNMENT,
        "es",
    ): "Se ha añadido una nueva asignación a tu horario",
    (
        NotificationType.USER_UPDATED_ASSIGNMENT,
        "es",
    ): "Tu asignación ha sido actualizada",
    (
        NotificationType.USER_DELETED_ASSIGNMENT,
        "es",
    ): "Tu asignación ha sido eliminada de tu horario",
    (
        NotificationType.USER_RECEIVED_TEAM_INVITE,
        "es",
    ): "Has sido invitado a unirte a un equipo",
    (
        NotificationType.USER_ACCEPTED_TEAM_INVITE,
        "es",
    ): "Un usuario aceptó tu invitación al equipo",
    (
        NotificationType.USER_REMOVED_FROM_TEAM,
        "es",
    ): "Has sido eliminado de un equipo",
    (
        NotificationType.USER_LEFT_TEAM,
        "es",
    ): "Un usuario ha abandonado tu equipo",
    # French
    (
        NotificationType.USER_PUBLISHED_SCHEDULE,
        "fr",
    ): "Votre planning a été publié",
    (NotificationType.USER_CREATED_REQUEST, "fr"): "Nouvelle demande reçue",
    (NotificationType.NEW_SWAP_REQUEST, "fr"): "Nouvelle demande d'échange",
    (
        NotificationType.SWAP_STATUS_CHANGED,
        "fr",
    ): "Le statut de votre échange a changé",
    (
        NotificationType.USER_ACCEPTED_REQUEST,
        "fr",
    ): "Votre demande a été approuvée",
    (
        NotificationType.USER_DENIED_REQUEST,
        "fr",
    ): "Votre demande a été refusée",
    (
        NotificationType.USER_CREATED_ASSIGNMENT,
        "fr",
    ): "Une nouvelle affectation a été ajoutée à votre planning",
    (
        NotificationType.USER_UPDATED_ASSIGNMENT,
        "fr",
    ): "Votre affectation a été mise à jour",
    (
        NotificationType.USER_DELETED_ASSIGNMENT,
        "fr",
    ): "Votre affectation a été supprimée de votre planning",
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
    (
        NotificationType.USER_LEFT_TEAM,
        "fr",
    ): "Un utilisateur a quitté votre équipe",
}


def build_email_context(
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
