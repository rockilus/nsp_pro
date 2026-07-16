from cerbos.engine.v1.engine_pb2 import (
    Principal,  # type: ignore[import]
    Resource,  # type: ignore[import]
)
from cerbos.sdk.grpc.client import AsyncCerbosClient  # type: ignore[import]
from shared.database.repositories.team_membership import (  # type: ignore
    TeamMembershipRepository,
)
from shared.database.repositories.user import UserRepository
from shared.logger import log_info
from shared.schemas.core import TEAM_ROLE_TO_AUTHZ_ROLE
from shared.schemas.core.user import SystemRole

from src.config import config


class CerbosAuthzService:
    def __init__(
        self,
        client: AsyncCerbosClient,
        user_db: UserRepository,
        team_membership_db: TeamMembershipRepository,
    ) -> None:
        self._client = client
        self._user_db = user_db
        self._team_membership_db = team_membership_db

    async def check(
        self,
        user_id: str,
        action: str,
        resource_kind: str,
        resource_id: str,
    ) -> bool:
        user = self._user_db.get_user_by_id(user_id)
        if user is None:
            log_info(f"CerbosAuthzService: user {user_id} not found")
            return False

        if user.system_role == SystemRole.SUPER_ADMIN:
            roles = {"super_admin"}
            # In dev mode, skip the Cerbos PDP round-trip for admin actions —
            # the PDP may not be running locally. The super_admin role
            # requirement above is enforced in every environment.
            if resource_kind == "admin" and config.environment == "development":
                return True
        elif resource_kind == "user":
            if user_id != resource_id:
                return False
            roles = {"owner"}
        elif resource_kind == "team":
            membership = (
                self._team_membership_db.get_team_membership_by_user_and_team_id(
                    user_id, resource_id
                )
            )
            if membership is None:
                return False
            authz_role = TEAM_ROLE_TO_AUTHZ_ROLE.get(membership.role.value)
            if authz_role is None:
                return False
            roles = {authz_role}
        elif resource_kind == "admin":
            # Admin actions are reserved for super_admins only.
            return False
        else:
            log_info(f"CerbosAuthzService: unknown resource kind '{resource_kind}'")
            return False

        principal = Principal(id=user_id, roles=list(roles))
        resource = Resource(id=resource_id, kind=resource_kind)

        return await self._client.is_allowed(action, principal, resource)
