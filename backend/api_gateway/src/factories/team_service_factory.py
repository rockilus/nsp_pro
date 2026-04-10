from fastapi import Depends, Request

from src.dependencies.database import get_db_collections
from src.dependencies.email_queue_service import get_email_queue_service
from src.dependencies.notification_service import get_notification_service
from src.dependencies.shift_service import get_shift_service
from src.dependencies.team_membership import get_team_membership_service
from src.services.team_service import TeamService

# pylint: disable=R0801


def get_team_service(request: Request = Depends()) -> TeamService:
    db_collections = get_db_collections(request)
    shift_service = get_shift_service()
    team_membership_service = get_team_membership_service()
    email_queue_service = get_email_queue_service()
    notification_service = get_notification_service(db_collections, email_queue_service)
    return TeamService(
        db_collections,
        shift_service,
        team_membership_service,
        notification_service,
    )
