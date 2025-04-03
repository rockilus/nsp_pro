from typing import Any, Callable, Coroutine

from shared.database.database_collections import DatabaseCollections
from shared.schemas import PasswordData, User
from shared.schemas.errors import UserNotFoundError

from src.errors import AuthnUpdateEmailError
from src.integrations.authentication.authn_types import RecipeUserIdType
from src.services.base_service import BaseService
from src.utils.user_utils import is_valid_email


class UserService(BaseService):
    def __init__(
        self,
        collection: DatabaseCollections,
        authz_user_sync: Callable[[User], Coroutine[Any, Any, None]],
        authn_update_user_email: Callable[
            [str, RecipeUserIdType, str, str], Coroutine[Any, Any, None]
        ],
        authn_change_password: Callable[
            [str, RecipeUserIdType, str, str, str], Coroutine[Any, Any, None]
        ],
    ):
        super().__init__(collection)
        self.authz_user_sync = authz_user_sync
        self.authn_update_user_email = authn_update_user_email
        self.authn_change_password = authn_change_password

    async def create_user(self, user: User) -> User:
        new_user = self.collection.user_db.create_user(user)
        await self.authz_user_sync(new_user)
        return new_user

    async def update_user(
        self, user: User, recipe_user_id: RecipeUserIdType, tenant_id: str
    ) -> User:
        existing_user = self.collection.user_db.get_user_by_id(user.id)
        if existing_user is None:
            raise UserNotFoundError(f"User with id {user.id} not found")
        if existing_user.email != user.email:
            await self.update_user_email(user, recipe_user_id, tenant_id)
        user.impersonating_user_id = existing_user.impersonating_user_id
        return self.collection.user_db.update_user(user)

    async def update_user_email(
        self,
        user: User,
        recipe_user_id: RecipeUserIdType,
        tenant_id: str,
    ) -> None:
        if not is_valid_email(user.email):
            raise AuthnUpdateEmailError("Invalid email")
        await self.authn_update_user_email(
            user.id, recipe_user_id, tenant_id, user.email
        )

    async def change_user_password(
        self,
        user_id: str,
        recipe_user_id: RecipeUserIdType,
        tenant_id: str,
        password_data: PasswordData,
    ) -> None:
        await self.authn_change_password(
            user_id,
            recipe_user_id,
            tenant_id,
            password_data.current_password,
            password_data.new_password,
        )

    def update_user_impersonating_user_id(
        self, user_id: str, impersonating_user_id: str | None
    ) -> User:
        user = self.collection.user_db.get_user_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User with id {user_id} not found")
        user.impersonating_user_id = impersonating_user_id
        return self.collection.user_db.update_user(user)
