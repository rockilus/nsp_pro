import asyncio
from dataclasses import dataclass
from typing import List

from permit import PermitApiError  # type: ignore
from permit import Permit, PermitConnectionError, UserRead  # type: ignore
from shared.logger import log_debug, log_info
from shared.schemas.core import Team, User

from src.config import config
from src.errors import AuthzConnectionError, handle_permit_errors

# Permit API doc:
# https://api.permit.io/v2/redoc#tag/Users


@dataclass
class UserAuth:
    id: str
    email: str


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


# Role assignments
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


async def authz_role_assignments_list(
    user_id: str, resource: str, resource_instance_key: str
) -> List[str]:
    try:
        role_assignments = await permit.api.role_assignments.list(
            user_key=user_id,
            resource_instance_key=f"{resource}:{resource_instance_key}",
            tenant_key="default",
        )
    except Exception as e:
        log_info("Permit role assignment get error")
        handle_permit_errors(e)
    return [r.role for r in role_assignments]


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
    user_id: str, action: str, resource: str, resource_id: str | None = None
) -> bool:
    """
    Check if a user is authorized to perform an action on a resource.

    Includes automatic retry logic based on configuration settings to handle
    policy sync timing issues with Permit.io. Retry behavior is controlled
    by config.authz_enable_retry, config.authz_max_retries, and
    config.authz_initial_delay.

    Args:
        user_id: User identifier
        action: Action to check (e.g., "create-worker")
        resource: Resource type (e.g., "team")
        resource_id: Specific resource instance ID

    Returns:
        bool: True if authorized, False otherwise

    Raises:
        Exception: If authorization check fails with errors after all retries
    """
    resource_instance = f"{resource}:{resource_id}" if resource_id else resource

    # If retry is disabled, use the original single-check logic
    if not config.authz_enable_retry:
        try:
            result = await permit.check(
                user=user_id,
                action=action,
                resource=resource_instance,
            )
            log_info(f"Authorization check result: {result} for {resource_instance}")
            return result
        except Exception as e:
            log_info("Permit check error")
            handle_permit_errors(e)
            return False

    # Retry logic enabled - use config settings
    max_retries = config.authz_max_retries
    initial_delay = config.authz_initial_delay

    for attempt in range(max_retries + 1):
        try:
            log_debug(
                f"Authorization attempt {attempt + 1}/{max_retries + 1}: "
                f"user={user_id}, action={action}, "
                f"resource={resource_instance}"
            )

            result = await permit.check(
                user=user_id,
                action=action,
                resource=resource_instance,
            )

            if result:
                if attempt > 0:
                    log_info(
                        f"Authorization succeeded on retry attempt "
                        f"{attempt + 1} for {resource_instance}"
                    )
                return True

            # If authorization failed and we have retries left, wait and retry
            if attempt < max_retries:
                backoff_delay = initial_delay * (2**attempt)
                log_info(
                    f"Authorization denied, retrying in {backoff_delay}s "
                    f"(attempt {attempt + 1}/{max_retries + 1}) "
                    f"for {resource_instance}"
                )
                await asyncio.sleep(backoff_delay)
            else:
                log_info(
                    f"Authorization denied after all {max_retries + 1} "
                    f"attempts for {resource_instance}"
                )
                return False

        except Exception as e:
            if attempt == max_retries:
                log_info(
                    f"Authorization check failed after "
                    f"{max_retries + 1} attempts for {resource_instance}: "
                    f"{str(e)}"
                )
                handle_permit_errors(e)
                return False

            backoff_delay = initial_delay * (2**attempt)
            log_info(
                f"Authorization error on attempt {attempt + 1}, "
                f"retrying in {backoff_delay}s: {str(e)}"
            )
            await asyncio.sleep(backoff_delay)

    return False


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


async def authz_delete_all_users() -> None:
    try:
        users = await authz_get_all_users()
        for user in users:
            await authz_delete_user(user.id)
    except Exception as e:
        log_info("Permit delete all users error")
        handle_permit_errors(e)


async def authz_delete_all_users_except(exclude_user_ids: List[str]) -> None:
    try:
        users = await authz_get_all_users()
        for user in users:
            if user.id not in exclude_user_ids:
                await authz_delete_user(user.id)
    except Exception as e:
        log_info("Permit delete all users (with exclusions) error")
        handle_permit_errors(e)


async def authz_delete_all_instances_except_user(user_id: str) -> None:
    """
    Delete all resource instances and users from Permit.io, except for the
    specified user.
    """
    try:
        await authz_delete_all_resource_instances()
        await authz_delete_all_users_except([user_id])
    except Exception as e:
        log_info("Permit delete all instances (with user exclusion) error")
        handle_permit_errors(e)


async def authz_delete_all_resource_instances() -> None:
    """Delete all resource instances from Permit.io."""
    try:
        # Keep fetching and deleting from page 1 until no more instances
        per_page = 100  # Adjust based on API limits

        while True:
            resource_instances = await permit.api.resource_instances.list(
                page=1, per_page=per_page
            )

            log_info(
                f"Fetched {len(resource_instances)} resource instances " f"for deletion"
            )

            # If no instances found, we're done
            if not resource_instances:
                break

            # Delete instances from current batch
            for instance in resource_instances:
                # Use the full resource instance identifier
                # (resource:key format)
                # Fallback to just the key if resource is not available
                if hasattr(instance, 'resource') and instance.resource:
                    resource_instance_id = f"{instance.resource}:{instance.key}"
                else:
                    # If resource is not available, try just the key
                    resource_instance_id = instance.key

                await permit.api.resource_instances.delete(resource_instance_id)

    except Exception as e:
        log_info("Permit delete all resource instances error")
        handle_permit_errors(e)


async def authz_delete_all_role_assignments() -> None:
    """Delete all role assignments from Permit.io."""
    try:
        # Keep fetching and deleting from page 1 until no more assignments
        per_page = 100  # Adjust based on API limits

        while True:
            role_assignments = await permit.api.role_assignments.list(
                page=1, per_page=per_page
            )

            # If no assignments found, we're done
            if not role_assignments:
                break

            # Delete assignments from current batch
            for assignment in role_assignments:
                # Extract resource type and key from resource_instance
                resource_type = "team"  # Default fallback
                resource_instance_key = "unknown"

                if assignment.resource_instance:
                    parts = assignment.resource_instance.split(":")
                    if len(parts) >= 2:
                        resource_type = parts[0]
                        resource_instance_key = parts[1]
                    else:
                        resource_instance_key = parts[0]

                await authz_role_assignment_unassign(
                    user_id=assignment.user,
                    resource=resource_type,
                    resource_instance_key=resource_instance_key,
                    role=assignment.role,
                )

    except Exception as e:
        log_info("Permit delete all role assignments error")
        handle_permit_errors(e)


async def authz_delete_all_instances() -> None:
    """
    Delete all users, resource instances, and role assignments from Permit.io.
    """
    try:
        # Delete in order: role assignments first, then resource instances,
        # then users
        # await authz_delete_all_role_assignments()
        await authz_delete_all_resource_instances()
        await authz_delete_all_users()
    except Exception as e:
        log_info("Permit delete all instances error")
        handle_permit_errors(e)


def permit_to_core_user_auth(user_read: UserRead) -> UserAuth:
    return UserAuth(
        id=user_read.key,
        email=user_read.email or "",
    )


async def authz_health_check() -> None:
    try:
        await permit.api.tenants.list()
    except Exception as e:
        log_info("Permit health check error, trying to reconnect: " + str(e))
        authz_connect(config.pdp_url, config.pdp_api_key)
