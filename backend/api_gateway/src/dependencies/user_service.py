from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.integrations.authentication.cognito_auth_client import (
    Boto3CognitoAuthClient,
)
from src.services.user_service import UserService


def get_user_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserService:
    return UserService(
        collection=db_collections,
        auth_client=Boto3CognitoAuthClient(),
    )
