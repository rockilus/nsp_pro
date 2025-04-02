from re import fullmatch

from shared.schemas import PasswordData, User
from shared.schemas.errors import UserNotFoundError

from src.errors import AuthnUpdateEmailError
from src.integrations.authentication.authn_change_password import (
    authn_change_password,
)
from src.integrations.authentication.authn_types import RecipeUserIdType
from src.integrations.authentication.authn_update_email import (
    authn_update_user_email,
)
from src.scripts.setup_database import user_db


async def update_user(
    user: User,
    recipe_user_id: RecipeUserIdType,
    tenant_id: str,
) -> User:
    existing_user = user_db.get_user_by_id(user.id)
    if existing_user is None:
        raise UserNotFoundError(f"User with id {user.id} not found")
    if existing_user.email != user.email:
        await update_user_email(user, recipe_user_id, tenant_id)
    user.impersonating_user_id = existing_user.impersonating_user_id
    return user_db.update_user(user)


async def update_user_email(
    user: User,
    recipe_user_id: RecipeUserIdType,
    tenant_id: str,
) -> None:
    if not is_valid_email(user.email):
        raise AuthnUpdateEmailError("Invalid email")
    await authn_update_user_email(user.id, recipe_user_id, tenant_id, user.email)


async def change_user_password(
    user_id: str,
    recipe_user_id: RecipeUserIdType,
    tenant_id: str,
    password_data: PasswordData,
) -> None:
    await authn_change_password(
        user_id,
        recipe_user_id,
        tenant_id,
        password_data.current_password,
        password_data.new_password,
    )


def update_user_impersonating_user_id(
    user_id: str, impersonating_user_id: str | None
) -> User:
    user = user_db.get_user_by_id(user_id)
    if user is None:
        raise UserNotFoundError(f"User with id {user_id} not found")
    user.impersonating_user_id = impersonating_user_id
    return user_db.update_user(user)


async def is_valid_email(value: str) -> bool:
    return (
        fullmatch(
            r'^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))'
            r"@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,"
            r"3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$",
            value,
        )
        is not None
    )
