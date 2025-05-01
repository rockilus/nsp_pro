from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.team_membership_service import TeamMembershipService


def get_team_membership_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> TeamMembershipService:
    return TeamMembershipService(
        db_collections,
    )
