from re import fullmatch

from core import PasswordData, User
from errors import AuthnUpdateEmailError, UserNotFoundError
from integrations.authentication.authn_change_password import authn_change_password
from integrations.authentication.authn_update_email import authn_update_user_email
from scripts.setup_database import user_db


async def update_user(user: User) -> User:
    existing_user = user_db.get_user_by_id(user.id)
    if existing_user is None:
        raise UserNotFoundError(f"User with id {user.id} not found")
    if existing_user.email != user.email:
        await update_user_email(user)
    return user_db.update_user(user)


async def update_user_email(user: User) -> None:
    if not is_valid_email(user.email):
        raise AuthnUpdateEmailError("Invalid email")
    await authn_update_user_email(user.id, user.email)


async def change_user_password(
    user_id: str, tenant_id: str, password_data: PasswordData
) -> None:
    await authn_change_password(
        user_id,
        tenant_id,
        password_data.current_password,
        password_data.new_password,
    )


async def is_valid_email(value: str) -> bool:
    return (
        fullmatch(
            r'^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))'
            r'@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,'
            r"3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$",
            value,
        )
        is not None
    )
