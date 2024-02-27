from typing import List

from permit import Permit  # type: ignore

from core.team import Team
from core.user import User
from scripts.setup_database import team_db
from utils.constants import Constants

permit = Permit(pdp=Constants.PDP_URL, token=Constants.PERMIT_API_KEY)


async def permit_user_sync(user: User) -> None:
    await permit.api.users.sync({"key": user.id, "email": user.email})


async def permit_team_resource_instance_create(team: Team) -> None:
    await permit.api.resource_instances.create(
        {
            "key": team.id,
            "resource": "team",
            "tenant": "default",
        }
    )


async def permit_role_assignment_assign(
    user_id: str, resource: str, resource_instance_key: str, role: str
) -> None:
    await permit.api.role_assignments.assign(
        {
            "role": role,
            "resource_instance": f"{resource}:{resource_instance_key}",
            "user": user_id,
            "tenant": "default",
        }
    )


async def permit_role_assignment_get_user_teams(user_id: str, role: str) -> List[Team]:
    team_permit = await permit.api.role_assignments.list(
        user_key=user_id,
        role_key=role,
        tenant_key="default",
    )
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
    return await permit.check(
        user=user_id,
        action=action,
        resource=resource_instance,
    )
