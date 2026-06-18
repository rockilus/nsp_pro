from fastapi import Request

from src.dependencies.database import get_db_collections
from src.integrations.authentication.cognito_auth_client import (
    Boto3CognitoAuthClient,
)
from src.services.user_service import UserService


# pylint: disable=R0801
def get_user_service(request: Request) -> UserService:
    db_collections = get_db_collections(request)
    return UserService(
        collection=db_collections,
        auth_client=Boto3CognitoAuthClient(),
    )
