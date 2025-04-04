from fastapi import Depends, Request

from src.dependencies.database import get_db_collections
from src.integrations.authentication.authn_change_password import (
    authn_change_password,
)
from src.integrations.authentication.authn_update_email import (
    authn_update_user_email,
)
from src.integrations.authorization.authz_services import authz_user_sync
from src.services.user_service import UserService


def get_user_service(request: Request = Depends()) -> UserService:
    db_collections = get_db_collections(request)
    return UserService(
        db_collections,
        authz_user_sync,
        authn_update_user_email,
        authn_change_password,
    )
