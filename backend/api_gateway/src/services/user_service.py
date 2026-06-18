from datetime import datetime, timezone

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Language, PasswordData, User
from shared.schemas.dto.user import UserUpdateDTO
from shared.schemas.errors import UserNotFoundError

from src.errors import AuthnUpdateEmailError
from src.integrations.authentication.cognito_auth_client import CognitoAuthClient
from src.services.base_service import BaseService
from src.utils.user_utils import is_valid_email


class UserService(BaseService):
    def __init__(
        self,
        collection: DatabaseCollections,
        auth_client: CognitoAuthClient,
    ):
        super().__init__(collection)
        self._auth = auth_client

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
        access_token: str,
        new_email: str,
    ) -> None:
        if not is_valid_email(new_email):
            raise AuthnUpdateEmailError("Invalid email")
        await self._auth.update_user_email(access_token, new_email)

    async def change_user_password(
        self, password_data: PasswordData, access_token: str = ""
    ) -> None:
        token = access_token or password_data.access_token
        await self._auth.change_password(
            token,
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
