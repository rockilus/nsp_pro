from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.notification_service import get_notification_service
from src.dependencies.shift_service import get_shift_service
from src.dependencies.team_membership import get_team_membership_service
from src.services.notification_service import NotificationService
from src.services.shift_service import ShiftService
from src.services.team_membership_service import TeamMembershipService
from src.services.team_service import TeamService


def get_team_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    shift_service: ShiftService = Depends(get_shift_service),
    team_membership_service: TeamMembershipService = Depends(
        get_team_membership_service
    ),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> TeamService:
    return TeamService(
        db_collections,
        shift_service,
        team_membership_service,
        notification_service,
    )
