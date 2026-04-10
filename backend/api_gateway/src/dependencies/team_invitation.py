from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.email_queue_service import get_email_queue_service
from src.dependencies.notification_service import get_notification_service
from src.dependencies.team_membership import get_team_membership_service
from src.services.email_queue_service import EmailQueueService
from src.services.notification_service import NotificationService
from src.services.team_invitation_service import TeamInvitationService
from src.services.team_membership_service import TeamMembershipService


def get_team_invitation_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    team_membership_service: TeamMembershipService = Depends(
        get_team_membership_service
    ),
    email_queue_service: EmailQueueService = Depends(get_email_queue_service),
    notification_service: NotificationService = Depends(get_notification_service),
) -> TeamInvitationService:
    return TeamInvitationService(
        db_collections,
        team_membership_service,
        email_queue_service,
        notification_service,
    )
