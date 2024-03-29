from typing import List

from permit import Permit, PermitConnectionError  # type: ignore

from core.team import Team
from core.user import User
from errors import AuthzConnectionError, handle_permit_errors
from logger import log_info
from utils.env_config import PDP_API_KEY, PDP_URL

try:
    permit = Permit(pdp=PDP_URL, token=PDP_API_KEY)
except PermitConnectionError as err:
    log_info("Permit connection error")
    raise AuthzConnectionError(
        "Failed to connect to Permit Policy Decision Point (PDP)"
    ) from err


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
