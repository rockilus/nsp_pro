from re import fullmatch
from typing import List

from shared.schemas.core import User, UserAuth, UserDashboard


def build_user_dashboard(
    users: List[User], users_authn: List[UserAuth], users_authz: List[UserAuth]
) -> List[UserDashboard]:
    # Create dictionaries for fast lookup
    users_dict = {user.id: user for user in users}
    authn_dict = {user_auth.id: user_auth for user_auth in users_authn}
    authz_dict = {user_auth.id: user_auth for user_auth in users_authz}

    user_ids = set(users_dict.keys()) | set(authn_dict.keys()) | set(authz_dict.keys())

    out: List[UserDashboard] = []

    for user_id in user_ids:
        out.append(
            UserDashboard(
                user=users_dict.get(user_id, None),
                user_authn=authn_dict.get(user_id, None),
                user_authz=authz_dict.get(user_id, None),
            )
        )

    return out


def is_valid_email(value: str) -> bool:
    return (
        fullmatch(
            r'^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))'
            r"@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,"
            r"3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$",
            value,
        )
        is not None
    )
