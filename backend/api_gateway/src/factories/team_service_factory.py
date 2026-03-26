from fastapi import Depends, Request

from src.dependencies.database import get_db_collections
from src.dependencies.notification_service import get_notification_service
from src.dependencies.shift_service import get_shift_service
from src.dependencies.team_membership import get_team_membership_service
from src.services.team_service import TeamService


def get_team_service(request: Request = Depends()) -> TeamService:
    db_collections = get_db_collections(request)
    shift_service = get_shift_service()
    team_membership_service = get_team_membership_service()
    notification_service = get_notification_service(db_collections)
    return TeamService(
        db_collections,
        shift_service,
        team_membership_service,
        notification_service,
    )
