from typing import List

from permit import PermitApiError  # type: ignore
from permit import Permit, PermitConnectionError, UserRead  # type: ignore
from shared.logger import log_debug, log_info
from shared.schemas.core import Team, User, UserAuth

from src.config import config
from src.errors import AuthzConnectionError, handle_permit_errors

# Permit API doc:
# https://api.permit.io/v2/redoc#tag/Users


def authz_connect(pdp_url: str, pdp_api_key: str) -> Permit:
    try:
        permit_obj = Permit(pdp=pdp_url, token=pdp_api_key)
        log_debug("Permit SDK initialization and connection to PDP OK")
        return permit_obj
    except PermitConnectionError as err:
        log_info("Permit connection error")
        raise AuthzConnectionError(
            "Failed to connect to Permit Policy Decision Point (PDP)"
        ) from err


permit = authz_connect(config.pdp_url, config.pdp_api_key)


async def authz_user_sync(user: User) -> None:
    try:
        await permit.api.users.sync({"key": user.id, "email": user.email})
    except Exception as e:
        log_info("Permit user sync error")
        handle_permit_errors(e)


async def authz_team_resource_instance_create(team: Team) -> None:
    try:
        await permit.api.resource_instances.create(
            {
                "key": team.id,
                "resource": "team",
                "tenant": "default",
            }
        )
    except Exception as e:
        log_info("Permit team resource instance create error")
        handle_permit_errors(e)


async def authz_role_assignment_assign(
    user_id: str, resource: str, resource_instance_key: str, role: str
) -> None:
    try:
        await permit.api.role_assignments.assign(
            {
                "role": role,
                "resource_instance": f"{resource}:{resource_instance_key}",
                "user": user_id,
                "tenant": "default",
            }
        )
    except Exception as e:
        log_info("Permit role assignment assign error")
        handle_permit_errors(e)


async def authz_role_assignment_unassign(
    user_id: str, resource: str, resource_instance_key: str, role: str
) -> None:
    try:
        await permit.api.role_assignments.unassign(
            {
                "role": role,
                "resource_instance": f"{resource}:{resource_instance_key}",
                "user": user_id,
                "tenant": "default",
            }
        )
    except Exception as e:
        log_info("Permit role assignment revoke error")
        handle_permit_errors(e)


async def authz_role_assignment_get_user_team_ids(user_id: str, role: str) -> List[str]:
    try:
        team_permit = await permit.api.role_assignments.list(
            user_key=user_id,
            role_key=role,
            tenant_key="default",
        )
    except Exception as e:
        log_info("Permit role assignment get user teams error")
        handle_permit_errors(e)
    return [t.resource_instance.split(":")[1] for t in team_permit]


async def authz_check(
    user_id: str,
    action: str,
    resource: str,
    resource_id: str | None = None,
) -> bool:
    resource_instance = f"{resource}:{resource_id}" if resource_id else resource
    try:
        out = await permit.check(
            user=user_id,
            action=action,
            resource=resource_instance,
        )
    except Exception as e:
        log_info("Permit check error")
        handle_permit_errors(e)
    return out


# async def authz_get_all_users():
#     try:
#         users = await permit.api.users.list()
#     except Exception as e:
#         log_info("Permit get all users error")
#         handle_permit_errors(e)
#     return users


async def authz_get_all_users() -> List[UserAuth]:
    users: List[UserRead] = []
    page = 1
    per_page = 100  # Adjust this value based on the actual limit specified by the API

    try:
        while True:
            response = await permit.api.users.list(page=page, per_page=per_page)
            users.extend(response.data)

            # Check if there's another page of results
            if len(response.data) < per_page:
                break
            page += 1

    except Exception as e:
        log_info("Permit get all users error")
        handle_permit_errors(e)

    return [permit_to_core_user_auth(u) for u in users]


async def authz_get_user(user_id: str) -> UserAuth | None:
    try:
        user = await permit.api.users.get(user_id)
    except PermitApiError as e:
        if e.status_code == 404:
            return None
        log_info("Permit get user error")
        handle_permit_errors(e)
    except Exception as e:
        log_info("Permit get user error")
        handle_permit_errors(e)
    return permit_to_core_user_auth(user)


async def authz_delete_user(user_id: str) -> None:
    try:
        await permit.api.users.delete(user_id)
    except Exception as e:
        log_info("Permit delete user error")
        handle_permit_errors(e)


def permit_to_core_user_auth(user_read: UserRead) -> UserAuth:
    return UserAuth(
        id=user_read.key,
        email=user_read.email,
    )


async def authz_health_check() -> None:
    try:
        await permit.api.tenants.list()
    except Exception as e:
        log_info("Permit health check error, trying to reconnect: " + str(e))
        authz_connect(config.pdp_url, config.pdp_api_key)
