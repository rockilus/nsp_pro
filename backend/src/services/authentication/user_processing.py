from core.user import User, UserSignUp
from services.authentication.dependencies import get_password_hash


def user_sign_up_to_user(user_sign_up: UserSignUp) -> User:
    return User(
        id="",
        username=user_sign_up.username,
        hashed_password=get_password_hash(user_sign_up.password),
        first_name=user_sign_up.first_name,
        last_name=user_sign_up.last_name,
        roles=[],
    )
