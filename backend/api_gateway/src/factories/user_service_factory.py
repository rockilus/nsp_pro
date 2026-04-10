from fastapi import Request

from src.dependencies.database import get_db_collections
from src.integrations.authentication.authn_change_password import (
    authn_change_password,
)
from src.integrations.authentication.authn_update_email import (
    authn_update_user_email,
)
from src.services.user_service import UserService


# pylint: disable=R0801
def get_user_service(request: Request) -> UserService:
    db_collections = get_db_collections(request)
    return UserService(
        collection=db_collections,
        authn_update_user_email=authn_update_user_email,
        authn_change_password=authn_change_password,
    )
