from typing import List

from shared.schemas.core import UserAuth
from supertokens_python.asyncio import (
    delete_user,
    get_user,
    get_users_newest_first,
)
from supertokens_python.types import User

# Supertokens API doc:
# https://app.swaggerhub.com/apis/supertokens/CDI/4.0.2#/Core/getUsers

# supertokens_python API doc:
# https://supertokens.com/docs/python/index.html


async def authn_get_user(user_id: str) -> UserAuth | None:
    user = await get_user(user_id)
    if not user:
        return None
    return user_supertokens_to_core(user)


async def authn_get_all_users() -> List[UserAuth]:
    users = []
    pagination_token = None

    while True:
        result = await get_users_newest_first(
            tenant_id="public",
            limit=100,
            pagination_token=pagination_token,
        )
        users.extend(result.users)
        if not result.next_pagination_token:
            break
        pagination_token = result.next_pagination_token
    return [user_supertokens_to_core(u) for u in users]


async def authn_delete_user(user_id: str) -> None:
    await delete_user(user_id)


def user_supertokens_to_core(user: User) -> UserAuth:
    return UserAuth(
        id=user.id,
        email=user.emails[0] if len(user.emails) > 0 else "",
    )
