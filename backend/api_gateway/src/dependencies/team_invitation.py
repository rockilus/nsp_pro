from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.team_membership import get_team_membership_service
from src.services.team_invitation_service import TeamInvitationService
from src.services.team_membership_service import TeamMembershipService


def get_team_invitation_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    team_membership_service: TeamMembershipService = Depends(
        get_team_membership_service
    ),
) -> TeamInvitationService:
    return TeamInvitationService(db_collections, team_membership_service)
