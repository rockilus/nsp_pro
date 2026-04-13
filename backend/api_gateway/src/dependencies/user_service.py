from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.integrations.authentication.authn_change_password import (
    authn_change_password,
)
from src.integrations.authentication.authn_update_email import (
    authn_update_user_email,
)
from src.services.user_service import UserService


def get_user_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserService:
    return UserService(
        collection=db_collections,
        authn_update_user_email=authn_update_user_email,
        authn_change_password=authn_change_password,
    )
