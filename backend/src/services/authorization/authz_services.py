from typing import List

from permit import Permit, PermitConnectionError  # type: ignore

from core.team import Team
from core.user import User
from errors import AuthzConnectionError, handle_authz_errors
from scripts.setup_database import team_db
from services.logging import log_info
from utils.env_config import PDP_API_KEY, PDP_URL

try:
    permit = Permit(pdp=PDP_URL, token=PDP_API_KEY)
except PermitConnectionError as err:
    log_info(f"Permit connection error: {err}")
    raise AuthzConnectionError(
        "Failed to connect to Permit Policy Decision Point (PDP)"
    ) from err


async def permit_user_sync(user: User) -> None:
    try:
        await permit.api.users.sync({"key": user.id, "email": user.email})
    except Exception as e:
        log_info(f"Permit user sync error: {e}")
        handle_authz_errors(e)


async def permit_team_resource_instance_create(team: Team) -> None:
    try:
        await permit.api.resource_instances.create(
            {
                "key": team.id,
                "resource": "team",
                "tenant": "default",
            }
        )
    except Exception as e:
        log_info(f"Permit team resource instance create error: {e}")
        handle_authz_errors(e)


async def permit_role_assignment_assign(
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
        log_info(f"Permit role assignment assign error: {e}")
        handle_authz_errors(e)


async def permit_role_assignment_get_user_teams(user_id: str, role: str) -> List[Team]:
    try:
        team_permit = await permit.api.role_assignments.list(
            user_key=user_id,
            role_key=role,
            tenant_key="default",
        )
    except Exception as e:
        log_info(f"Permit role assignment get user teams error: {e}")
        handle_authz_errors(e)
    return [
        team_db.get_team_by_id(t.resource_instance.split(":")[1]) for t in team_permit
    ]


async def permit_check(
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
        log_info(f"Permit check error: {e}")
        handle_authz_errors(e)
    return out
