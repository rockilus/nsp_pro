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
    NotificationType.USER_CREATED_DIRECT_SWAP: (
        "notification_user_created_direct_swap_email",
        EmailType.NOTIFICATION_USER_CREATED_DIRECT_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_ACCEPTED_DIRECT_SWAP: (
        "notification_user_accepted_direct_swap_email",
        EmailType.NOTIFICATION_USER_ACCEPTED_DIRECT_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_REFUSED_DIRECT_SWAP: (
        "notification_user_refused_direct_swap_email",
        EmailType.NOTIFICATION_USER_REFUSED_DIRECT_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_CREATED_OPEN_SWAP: (
        "notification_user_created_open_swap_email",
        EmailType.NOTIFICATION_USER_CREATED_OPEN_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_BID_OPEN_SWAP: (
        "notification_user_bid_open_swap_email",
        EmailType.NOTIFICATION_USER_BID_OPEN_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_SELECTED_BID_OPEN_SWAP: (
        "notification_user_selected_bid_open_swap_email",
        EmailType.NOTIFICATION_USER_SELECTED_BID_OPEN_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP: (
        "notification_user_selected_other_bid_open_swap_email",
        EmailType.NOTIFICATION_USER_SELECTED_OTHER_BID_OPEN_SWAP,
        "/plan/swaps",
    ),
    NotificationType.SWAP_READY_FOR_REVIEW: (
        "notification_swap_ready_for_review_email",
        EmailType.NOTIFICATION_SWAP_READY_FOR_REVIEW,
        "/plan/swaps",
    ),
    NotificationType.USER_VALIDATED_SWAP: (
        "notification_user_validated_swap_email",
        EmailType.NOTIFICATION_USER_VALIDATED_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_DENIED_SWAP: (
        "notification_user_denied_swap_email",
        EmailType.NOTIFICATION_USER_DENIED_SWAP,
        "/plan/swaps",
    ),
    NotificationType.USER_REVERSED_SWAP: (
        "notification_user_reversed_swap_email",
        EmailType.NOTIFICATION_USER_REVERSED_SWAP,
        "/plan/swaps",
    ),
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET: (
        "notification_campaign_request_deadline_set_email",
        EmailType.NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_SET,
        "/plan/requests",
    ),
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER: (
        "notification_campaign_request_deadline_reminder_email",
        EmailType.NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_REMINDER,
        "/plan/requests",
    ),
    NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED: (
        "notification_campaign_request_deadline_updated_email",
        EmailType.NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_UPDATED,
        "/plan/requests",
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
    # Swap notification subjects — English
    (
        NotificationType.USER_CREATED_DIRECT_SWAP,
        "en",
    ): "A new swap request is waiting for you",
    (
        NotificationType.USER_ACCEPTED_DIRECT_SWAP,
        "en",
    ): "Your swap request was accepted",
    (
        NotificationType.USER_REFUSED_DIRECT_SWAP,
        "en",
    ): "Your swap request was declined",
    (
        NotificationType.USER_CREATED_OPEN_SWAP,
        "en",
    ): "A new open swap is available",
    (
        NotificationType.USER_BID_OPEN_SWAP,
        "en",
    ): "Someone bid on your open swap",
    (
        NotificationType.USER_SELECTED_BID_OPEN_SWAP,
        "en",
    ): "Your swap bid was selected",
    (
        NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP,
        "en",
    ): "A different bid was selected",
    (
        NotificationType.SWAP_READY_FOR_REVIEW,
        "en",
    ): "A swap is ready for your review",
    (
        NotificationType.USER_VALIDATED_SWAP,
        "en",
    ): "Your swap has been approved",
    (
        NotificationType.USER_DENIED_SWAP,
        "en",
    ): "Your swap has been denied",
    (
        NotificationType.USER_REVERSED_SWAP,
        "en",
    ): "Your swap has been reversed",
    # Spanish
    (
        NotificationType.USER_PUBLISHED_SCHEDULE,
        "es",
    ): "Tu horario ha sido publicado",
    (NotificationType.USER_CREATED_REQUEST, "es"): "Nueva solicitud recibida",
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
    # Swap notification subjects — Spanish
    (
        NotificationType.USER_CREATED_DIRECT_SWAP,
        "es",
    ): "Una nueva solicitud de cambio te está esperando",
    (
        NotificationType.USER_ACCEPTED_DIRECT_SWAP,
        "es",
    ): "Tu solicitud de cambio fue aceptada",
    (
        NotificationType.USER_REFUSED_DIRECT_SWAP,
        "es",
    ): "Tu solicitud de cambio fue rechazada",
    (
        NotificationType.USER_CREATED_OPEN_SWAP,
        "es",
    ): "Un nuevo cambio abierto está disponible",
    (
        NotificationType.USER_BID_OPEN_SWAP,
        "es",
    ): "Alguien ofreció un cambio en tu solicitud abierta",
    (
        NotificationType.USER_SELECTED_BID_OPEN_SWAP,
        "es",
    ): "Tu oferta de cambio fue seleccionada",
    (
        NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP,
        "es",
    ): "Se seleccionó una oferta diferente",
    (
        NotificationType.SWAP_READY_FOR_REVIEW,
        "es",
    ): "Un cambio está listo para tu revisión",
    (
        NotificationType.USER_VALIDATED_SWAP,
        "es",
    ): "Tu cambio ha sido aprobado",
    (
        NotificationType.USER_DENIED_SWAP,
        "es",
    ): "Tu cambio ha sido denegado",
    (
        NotificationType.USER_REVERSED_SWAP,
        "es",
    ): "Tu cambio ha sido revertido",
    # French
    (
        NotificationType.USER_PUBLISHED_SCHEDULE,
        "fr",
    ): "Votre planning a été publié",
    (NotificationType.USER_CREATED_REQUEST, "fr"): "Nouvelle demande reçue",
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
    # Swap notification subjects — French
    (
        NotificationType.USER_CREATED_DIRECT_SWAP,
        "fr",
    ): "Une nouvelle demande d'échange vous attend",
    (
        NotificationType.USER_ACCEPTED_DIRECT_SWAP,
        "fr",
    ): "Votre demande d'échange a été acceptée",
    (
        NotificationType.USER_REFUSED_DIRECT_SWAP,
        "fr",
    ): "Votre demande d'échange a été refusée",
    (
        NotificationType.USER_CREATED_OPEN_SWAP,
        "fr",
    ): "Un nouvel échange ouvert est disponible",
    (
        NotificationType.USER_BID_OPEN_SWAP,
        "fr",
    ): "Quelqu'un a proposé un échange sur votre demande ouverte",
    (
        NotificationType.USER_SELECTED_BID_OPEN_SWAP,
        "fr",
    ): "Votre proposition d'échange a été sélectionnée",
    (
        NotificationType.USER_SELECTED_OTHER_BID_OPEN_SWAP,
        "fr",
    ): "Une autre proposition a été sélectionnée",
    (
        NotificationType.SWAP_READY_FOR_REVIEW,
        "fr",
    ): "Un échange est prêt pour votre examen",
    (
        NotificationType.USER_VALIDATED_SWAP,
        "fr",
    ): "Votre échange a été approuvé",
    (
        NotificationType.USER_DENIED_SWAP,
        "fr",
    ): "Votre échange a été refusé",
    (
        NotificationType.USER_REVERSED_SWAP,
        "fr",
    ): "Votre échange a été annulé",
    # Campaign request deadline subjects — English
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET,
        "en",
    ): "Your team leader has requested your availability",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER,
        "en",
    ): "Reminder: Submit your availability requests",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED,
        "en",
    ): "Your request submission deadline has been extended",
    # Campaign request deadline subjects — Spanish
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET,
        "es",
    ): "Tu líder de equipo ha solicitado tu disponibilidad",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER,
        "es",
    ): "Recordatorio: Envía tus solicitudes de disponibilidad",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED,
        "es",
    ): "Tu plazo de envío de solicitudes ha sido extendido",
    # Campaign request deadline subjects — French
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_SET,
        "fr",
    ): "Votre responsable d'équipe a demandé vos disponibilités",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_REMINDER,
        "fr",
    ): "Rappel : Soumettez vos demandes de disponibilité",
    (
        NotificationType.CAMPAIGN_REQUEST_DEADLINE_UPDATED,
        "fr",
    ): "Votre délai de soumission des demandes a été prolongé",
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
