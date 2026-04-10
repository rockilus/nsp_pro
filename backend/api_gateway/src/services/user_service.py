from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Language, PasswordData, User
from shared.schemas.dto.user import UserUpdateDTO
from shared.schemas.errors import UserNotFoundError

from src.errors import AuthnUpdateEmailError
from src.services.base_service import BaseService
from src.utils.user_utils import is_valid_email


class UserService(BaseService):
    # pylint: disable=too-many-arguments, too-many-positional-arguments
    def __init__(
        self,
        collection: DatabaseCollections,
        authz_user_sync: Callable[[User], Coroutine[Any, Any, None]],
        authz_role_assignment_assign: Callable[
            [str, str, str, str], Coroutine[Any, Any, None]
        ],
        authn_update_user_email: Callable[[str, str, str], Coroutine[Any, Any, None]],
        authn_change_password: Callable[[str, str, str], Coroutine[Any, Any, None]],
    ):
        super().__init__(collection)
        self.authz_user_sync = authz_user_sync
        self.authz_role_assignment_assign = authz_role_assignment_assign
        self.authn_update_user_email = authn_update_user_email
        self.authn_change_password = authn_change_password

    async def create_user(
        self,
        user_id: str,
        email: str,
        first_name: str,
        last_name: str,
        language: str | None = None,
    ) -> User:
        # Check if user already exists to ensure idempotency
        existing_user = self.collection.user_db.get_user_by_id(user_id)
        if existing_user is not None:
            # Log for audit purposes
            log_info(f"User with id {user_id} already exists, returning existing user")
            return existing_user

        user_language = language if language else "fr"
        try:
            lang = Language(user_language)  # type: ignore[call-arg]
        except ValueError:
            lang = Language("fr")  # type: ignore[call-arg]
        user = User(
            id=user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            language=lang,  # type: ignore
            sign_up_at=datetime.now(timezone.utc),
            impersonating_user_id=None,
        )
        new_user = self.collection.user_db.create_user(user)
        await self.authz_user_sync(new_user)
        await self.authz_role_assignment_assign(
            user_id=new_user.id,  # type: ignore[call-arg]
            resource="user",  # type: ignore[call-arg]
            resource_instance_key=new_user.id,  # type: ignore[call-arg]
            role="owner",  # type: ignore[call-arg]
        )
        return new_user

    async def update_user(self, user_id: str, update_dto: UserUpdateDTO) -> User:
        existing_user = self.collection.user_db.get_user_by_id(user_id)
        if existing_user is None:
            raise UserNotFoundError(f"User with id {user_id} not found")

        # Build an updated User, only applying fields the user is allowed to change.
        # system_role and impersonating_user_id are always carried over from the
        # existing DB record — they cannot be overwritten via this path.
        updated_user = User(
            id=existing_user.id,
            email=existing_user.email,
            first_name=update_dto.firstName,
            last_name=update_dto.lastName,
            language=Language(update_dto.language),
            sign_up_at=existing_user.sign_up_at,
            impersonating_user_id=existing_user.impersonating_user_id,
            system_role=existing_user.system_role,
        )

        return self.collection.user_db.update_user(updated_user)

    async def update_user_email(
        self,
        user: User,
        tenant_id: str,
    ) -> None:
        if not is_valid_email(user.email):
            raise AuthnUpdateEmailError("Invalid email")
        await self.authn_update_user_email(user.id, tenant_id, user.email)

    async def change_user_password(self, password_data: PasswordData) -> None:
        await self.authn_change_password(
            password_data.current_password,
            password_data.new_password,
            password_data.access_token,
        )

    def update_user_impersonating_user_id(
        self, user_id: str, impersonating_user_id: str | None
    ) -> User:
        user = self.collection.user_db.get_user_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User with id {user_id} not found")
        user.impersonating_user_id = impersonating_user_id
        return self.collection.user_db.update_user(user)
