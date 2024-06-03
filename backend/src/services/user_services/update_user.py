from re import fullmatch

from core import User
from errors import UpdateEmailError
from integrations.authentication.authn_update_email import authn_update_user_email
from scripts.setup_database import user_db


async def update_user(user: User) -> User:
    existing_user = user_db.get_user_by_id(user.id)
    if existing_user.email != user.email:
        await update_user_email(user)
    return user_db.update_user(user)


async def update_user_email(user: User) -> None:
    if not is_valid_email(user.email):
        raise UpdateEmailError("Invalid email")
    await authn_update_user_email(user.id, user.email)


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
