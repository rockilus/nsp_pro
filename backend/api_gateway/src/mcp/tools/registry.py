"""Shared tool registry for dual-use execution.

Each tool exposes:
  - a LiteLLM-compatible function schema (``manifest``) consumed by the copilot
    agent when routing user intent, and
  - an async ``executor`` that enforces authorization with the caller's real
    ``UserContext`` before invoking the pure business logic.

Both the FastMCP tools (``src/mcp/tools/*.py``) and ``CopilotAgentService``
call the same executors, so authorization is enforced identically on every
path. Executors NEVER accept ``ctx=None`` or bypass Cerbos.
"""

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from shared.database.database_collections import DatabaseCollections

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.models import WorkerRosterItem
from src.mcp.tools.workers import _build_team_members
from src.security.user_context import UserContext

logger = logging.getLogger(__name__)

ToolExecutor = Callable[..., Awaitable[Any]]


@dataclass(frozen=True)
class ToolSpec:
    """A tool usable by both the MCP server and the copilot agent."""

    name: str
    manifest: dict[str, Any]
    executor: ToolExecutor


async def _execute_get_team_members(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    team_id: str,
) -> list[WorkerRosterItem]:
    """Authorize the caller, then return the team roster.

    Authorization is evaluated against the authenticated user's own role
    (``user_context.user_id``) — never the impersonated identity — matching the
    project-wide Cerbos convention.
    """
    logger.info(
        "Tool get_team_members: user=%s team=%s",
        user_context.user_id,
        team_id,
    )
    if not await cerbos.check(user_context.user_id, "read-workers", "team", team_id):
        return []
    return _build_team_members(db, team_id)


GET_TEAM_MEMBERS = ToolSpec(
    name="get_team_members",
    manifest={
        "type": "function",
        "function": {
            "name": "get_team_members",
            "description": (
                "Return every active team member with their full scheduling "
                "profile: identity, specialties, contract hours, employment "
                "dates, custom dimensions (e.g. Location, Seniority), and "
                "weekly availability preferences. Use for any question about "
                "who the workers are, what they do, or their attributes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "team_id": {
                        "type": "string",
                        "description": "The target team identifier.",
                    }
                },
                "required": ["team_id"],
            },
        },
    },
    executor=_execute_get_team_members,
)


TOOL_REGISTRY: dict[str, ToolSpec] = {
    GET_TEAM_MEMBERS.name: GET_TEAM_MEMBERS,
}


def get_tool_manifests() -> list[dict[str, Any]]:
    """Return the LiteLLM ``tools`` manifest for all registered tools."""
    return [spec.manifest for spec in TOOL_REGISTRY.values()]
