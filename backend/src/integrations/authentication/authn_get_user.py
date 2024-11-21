from typing import Dict, List

import requests
from supertokens_python.asyncio import delete_user, get_user
from supertokens_python.types import User

from core import UserAuth
from utils.env_config import ST_API_KEY, ST_CONNECTION_URI

# Supertokens API doc:
# https://app.swaggerhub.com/apis/supertokens/CDI/4.0.2#/Core/getUsers

# supertokens_python API doc:
# https://supertokens.com/docs/python/index.html


async def authn_get_user(user_id: str) -> UserAuth | None:
    user = await get_user(user_id)
    if not user:
        return None
    return user_supertokens_to_core(user)


def authn_get_all_users() -> List[UserAuth]:
    users = []
    pagination_token = None

    try:
        while True:
            params = {
                "limit": 100,
            }
            if pagination_token:
                params["paginationToken"] = pagination_token

            response = requests.get(
                f"{ST_CONNECTION_URI}/users",
                headers={"api-key": ST_API_KEY},
                params=params,
                timeout=10,
            )
            response.raise_for_status()  # Raise an exception for HTTP errors
            data = response.json()

            users.extend(data["users"])

            # Check if there's another page of results
            if "nextPaginationToken" in data:
                pagination_token = data["nextPaginationToken"]
            else:
                break

    except requests.exceptions.RequestException as e:
        print(f"Error fetching users: {e}")
        return []

    return [user_dict_supertokens_to_core(u) for u in users]


async def authn_delete_user(user_id: str) -> None:
    await delete_user(user_id)


def user_dict_supertokens_to_core(user_st: Dict) -> UserAuth:
    return UserAuth(
        id=user_st.get("id", ""),
        email=user_st.get("email", ""),
    )


def user_supertokens_to_core(user: User) -> UserAuth:
    return UserAuth(
        id=user.id,
        email=user.emails[0] if len(user.emails) > 0 else "",
    )
