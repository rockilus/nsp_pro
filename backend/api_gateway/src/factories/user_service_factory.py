from fastapi import Request

from src.dependencies.database import get_db_collections
from src.integrations.authentication.authn_change_password import (
    authn_change_password,
)
from src.integrations.authentication.authn_update_email import (
    authn_update_user_email,
)
from src.integrations.authorization.authz_services import (
    authz_role_assignment_assign,
    authz_user_sync,
)
from src.services.user_service import UserService


# pylint: disable=R0801
def get_user_service(request: Request) -> UserService:
    db_collections = get_db_collections(request)
    return UserService(
        collection=db_collections,
        authz_user_sync=authz_user_sync,
        authz_role_assignment_assign=authz_role_assignment_assign,
        authn_update_user_email=authn_update_user_email,
        authn_change_password=authn_change_password,
    )
