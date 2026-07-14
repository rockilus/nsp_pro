"""Shared tool registry for dual-use execution.

Each tool exposes:
  - a LiteLLM-compatible function schema (``manifest``) consumed by the copilot
    agent when routing user intent, and
  - an async ``executor`` that enforces authorization with the caller's real
    ``UserContext`` before invoking the pure business logic.

Both the FastMCP tools (``src/mcp/tools/*.py``) and ``CopilotAgentService``
call the same executors, so authorization is enforced identically on every
path. Executors NEVER accept ``ctx=None`` or bypass Cerbos.

Visibility is controlled per tool AND per channel via ``ToolChannel``:
  - ``COPILOT``: exposed to the in-app copilot agent loop.
  - ``MCP``:     exposed to external MCP clients.

Write tools are currently ``COPILOT``-only; flipping a spec's ``channels`` to
include ``MCP`` is all that's needed to expose it there later.

``confirmation_tier`` drives the Human-in-the-Loop flow:
  - ``"none"``:   read tools and Tier-3 creates → executed immediately.
  - ``"update"``: Tier-2 → preview a field diff, execute on confirmation.
  - ``"delete"``: Tier-1 → preview a summary, execute on confirmation.
"""

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import Flag, auto
from typing import Any, Literal

from shared.database.database_collections import DatabaseCollections

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.models import WorkerRosterItem
from src.mcp.schemas.dimension_arguments import (
    CreateDimensionArgs,
    CreateDimEntryArgs,
    DeleteDimensionArgs,
    DeleteDimEntryArgs,
    UpdateDimensionArgs,
    UpdateDimEntryArgs,
)
from src.mcp.schemas.temporal_arguments import CalculateRelativeDateArgs
from src.mcp.schemas.worker_arguments import (
    CreateWorkerArgs,
    DeleteWorkerArgs,
    SetWorkerDimensionValueArgs,
    UpdateWorkerArgs,
)
from src.mcp.schemas.worker_reference_args import ResolveWorkerReferenceArgs
from src.mcp.tools.dimension_writes import (
    execute_create_dim_entry,
    execute_create_dimension,
    execute_delete_dim_entry,
    execute_delete_dimension,
    execute_get_dimensions,
    execute_update_dim_entry,
    execute_update_dimension,
)
from src.mcp.tools.temporal_queries import calculate_relative_date
from src.mcp.tools.worker_reference import execute_resolve_worker_reference
from src.mcp.tools.worker_writes import (
    execute_create_worker,
    execute_delete_worker,
    execute_set_worker_dimension_value,
    execute_update_worker,
)
from src.mcp.tools.workers import _build_team_members
from src.security.user_context import UserContext

logger = logging.getLogger(__name__)

ToolExecutor = Callable[..., Awaitable[Any]]

ConfirmationTier = Literal["none", "update", "delete"]


class ToolChannel(Flag):
    """Channels a tool can be exposed on."""

    COPILOT = auto()
    MCP = auto()


@dataclass
class ToolOutputField:
    """Describes a field in a tool's output for Planner variable binding."""

    key: str
    type_: str
    description: str
    extractable: bool = True


@dataclass(frozen=True)
class ToolSpec:
    """A tool usable by the copilot agent and/or the MCP server."""

    name: str
    manifest: dict[str, Any]
    executor: ToolExecutor
    channels: ToolChannel = ToolChannel.COPILOT | ToolChannel.MCP
    confirmation_tier: ConfirmationTier = "none"
    output_schema: list[ToolOutputField] | None = None


def _fn_manifest(name: str, description: str, parameters: dict[str, Any]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


# --------------------------------------------------------------------------- #
# Read tools (COPILOT + MCP)
# --------------------------------------------------------------------------- #


async def _execute_get_team_members(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    team_id: str,
) -> list[WorkerRosterItem]:
    """Authorize the caller, then return the team roster."""
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
    manifest=_fn_manifest(
        "get_team_members",
        (
            "Return every active team member with their full scheduling "
            "profile: identity, specialties, contract hours, employment "
            "dates, custom dimensions (e.g. Location, Seniority), and "
            "weekly availability preferences. Use for any question about "
            "who the workers are, what they do, or their attributes."
        ),
        {
            "type": "object",
            "properties": {
                "team_id": {
                    "type": "string",
                    "description": "The target team identifier.",
                }
            },
            "required": ["team_id"],
        },
    ),
    executor=_execute_get_team_members,
    output_schema=[
        ToolOutputField(
            "workers",
            "list[WorkerRosterItem]",
            "List of team members; use resolve_worker_reference to pick a "
            "single worker_id from a name fragment.",
            False,
        ),
    ],
)


GET_DIMENSIONS = ToolSpec(
    name="get_dimensions",
    manifest=_fn_manifest(
        "get_dimensions",
        (
            "List the team's custom worker dimensions and, for dropdown "
            "dimensions, their selectable entries (options) with IDs. Use this "
            "to resolve a dimension or option name to its ID before setting a "
            "worker's dimension value or editing dimensions/options."
        ),
        {
            "type": "object",
            "properties": {
                "team_id": {
                    "type": "string",
                    "description": "The target team identifier.",
                }
            },
            "required": ["team_id"],
        },
    ),
    executor=execute_get_dimensions,
    output_schema=[
        ToolOutputField(
            "dimensions",
            "list[Dimension]",
            "List of dimensions with dimension_id, name, dim_entries for "
            "dropdown dimensions. Use dimension_id and dim_entry_ids for "
            "subsequent write calls.",
            False,
        ),
    ],
)

CALCULATE_RELATIVE_DATE = ToolSpec(
    name="calculate_relative_date",
    manifest=_fn_manifest(
        "calculate_relative_date",
        (
            "Compute exact UTC calendar dates from relative expressions. "
            "Call this for EVERY relative date the user mentions "
            "('tomorrow', 'next Monday', 'first Wednesday of next month', "
            "'in 3 days') before passing the result to any other tool. "
            "Never perform date math in your head — always delegate to "
            "this tool."
        ),
        CalculateRelativeDateArgs.model_json_schema(),
    ),
    executor=calculate_relative_date,
    channels=ToolChannel.COPILOT,
    confirmation_tier="none",
    output_schema=[
        ToolOutputField(
            "calculated_date",
            "str",
            "The resolved ISO date string (YYYY-MM-DD) suitable for passing "
            "directly into write-tool date fields.",
            True,
        ),
    ],
)


# --------------------------------------------------------------------------- #
# Write tools (COPILOT only for now)
# --------------------------------------------------------------------------- #

CREATE_WORKER = ToolSpec(
    name="create_worker",
    manifest=_fn_manifest(
        "create_worker",
        "Add a brand new nurse or clinician to the active team roster. "
        "Creation is applied immediately.",
        CreateWorkerArgs.model_json_schema(),
    ),
    executor=execute_create_worker,
    channels=ToolChannel.COPILOT,
    confirmation_tier="none",
    output_schema=[
        ToolOutputField(
            "worker_id",
            "str",
            "The unique identifier of the newly created worker.",
            True,
        ),
    ],
)

UPDATE_WORKER = ToolSpec(
    name="update_worker_fields",
    manifest=_fn_manifest(
        "update_worker_fields",
        "Update selected profile/contract fields of an existing worker. Only "
        "provide fields the user wants to change. This prepares the change for "
        "the user's confirmation; it is NOT applied until confirmed.",
        UpdateWorkerArgs.model_json_schema(),
    ),
    executor=execute_update_worker,
    channels=ToolChannel.COPILOT,
    confirmation_tier="update",
)

SOFT_DELETE_WORKER = ToolSpec(
    name="soft_delete_worker",
    manifest=_fn_manifest(
        "soft_delete_worker",
        "Remove an active team member by flagging them as deleted. This "
        "prepares the deletion for the user's confirmation; it is NOT applied "
        "until confirmed.",
        DeleteWorkerArgs.model_json_schema(),
    ),
    executor=execute_delete_worker,
    channels=ToolChannel.COPILOT,
    confirmation_tier="delete",
)

SET_WORKER_DIMENSION_VALUE = ToolSpec(
    name="set_worker_dimension_value",
    manifest=_fn_manifest(
        "set_worker_dimension_value",
        "Set or change a worker's value for a single custom dimension (e.g. "
        "Location = Paris). Use get_dimensions first to resolve dropdown "
        "option IDs. Prepares the change for confirmation; NOT applied until "
        "confirmed.",
        SetWorkerDimensionValueArgs.model_json_schema(),
    ),
    executor=execute_set_worker_dimension_value,
    channels=ToolChannel.COPILOT,
    confirmation_tier="update",
)

CREATE_DIMENSION = ToolSpec(
    name="create_dimension",
    manifest=_fn_manifest(
        "create_dimension",
        "Create a new custom worker dimension (optionally with dropdown "
        "options). Applied immediately.",
        CreateDimensionArgs.model_json_schema(),
    ),
    executor=execute_create_dimension,
    channels=ToolChannel.COPILOT,
    confirmation_tier="none",
    output_schema=[
        ToolOutputField(
            "dimension_id",
            "str",
            "The unique identifier of the newly created dimension.",
            True,
        ),
    ],
)

UPDATE_DIMENSION = ToolSpec(
    name="update_dimension",
    manifest=_fn_manifest(
        "update_dimension",
        "Rename an existing dimension. Prepares the change for confirmation; "
        "NOT applied until confirmed.",
        UpdateDimensionArgs.model_json_schema(),
    ),
    executor=execute_update_dimension,
    channels=ToolChannel.COPILOT,
    confirmation_tier="update",
)

SOFT_DELETE_DIMENSION = ToolSpec(
    name="soft_delete_dimension",
    manifest=_fn_manifest(
        "soft_delete_dimension",
        "Remove a dimension (and its options/values) by flagging as deleted. "
        "Prepares the deletion for confirmation; NOT applied until confirmed.",
        DeleteDimensionArgs.model_json_schema(),
    ),
    executor=execute_delete_dimension,
    channels=ToolChannel.COPILOT,
    confirmation_tier="delete",
)

CREATE_DIM_ENTRY = ToolSpec(
    name="create_dim_entry",
    manifest=_fn_manifest(
        "create_dim_entry",
        "Add a new selectable option to a dropdown dimension. Applied immediately.",
        CreateDimEntryArgs.model_json_schema(),
    ),
    executor=execute_create_dim_entry,
    channels=ToolChannel.COPILOT,
    confirmation_tier="none",
    output_schema=[
        ToolOutputField(
            "dim_entry_id",
            "str",
            "The unique identifier of the newly created dropdown option.",
            True,
        ),
    ],
)

UPDATE_DIM_ENTRY = ToolSpec(
    name="update_dim_entry",
    manifest=_fn_manifest(
        "update_dim_entry",
        "Rename an existing dropdown option. Prepares the change for "
        "confirmation; NOT applied until confirmed.",
        UpdateDimEntryArgs.model_json_schema(),
    ),
    executor=execute_update_dim_entry,
    channels=ToolChannel.COPILOT,
    confirmation_tier="update",
)

DELETE_DIM_ENTRY = ToolSpec(
    name="delete_dim_entry",
    manifest=_fn_manifest(
        "delete_dim_entry",
        "Remove a dropdown option by flagging as deleted. Prepares the "
        "deletion for confirmation; NOT applied until confirmed.",
        DeleteDimEntryArgs.model_json_schema(),
    ),
    executor=execute_delete_dim_entry,
    channels=ToolChannel.COPILOT,
    confirmation_tier="delete",
)

RESOLVE_WORKER_REFERENCE = ToolSpec(
    name="resolve_worker_reference",
    manifest=_fn_manifest(
        "resolve_worker_reference",
        "Find a unique worker_id from a worker name or name fragment. "
        "Use this to resolve a user-mentioned worker name to an ID before "
        "calling update_worker_fields, soft_delete_worker, or "
        "set_worker_dimension_value. Returns a flat dict with worker_id, "
        "name, and acronym on exact match; returns an error with candidate "
        "names on ambiguous partial matches.",
        ResolveWorkerReferenceArgs.model_json_schema(),
    ),
    executor=execute_resolve_worker_reference,
    channels=ToolChannel.COPILOT,
    confirmation_tier="none",
    output_schema=[
        ToolOutputField(
            "worker_id",
            "str",
            "The unique identifier of the resolved worker.",
            True,
        ),
        ToolOutputField(
            "name",
            "str",
            "The worker's full name for display/verification.",
            False,
        ),
        ToolOutputField(
            "acronym",
            "str",
            "The worker's short acronym for display/verification.",
            False,
        ),
    ],
)


TOOL_REGISTRY: dict[str, ToolSpec] = {
    spec.name: spec
    for spec in (
        GET_TEAM_MEMBERS,
        GET_DIMENSIONS,
        CALCULATE_RELATIVE_DATE,
        CREATE_WORKER,
        UPDATE_WORKER,
        SOFT_DELETE_WORKER,
        SET_WORKER_DIMENSION_VALUE,
        CREATE_DIMENSION,
        UPDATE_DIMENSION,
        SOFT_DELETE_DIMENSION,
        CREATE_DIM_ENTRY,
        UPDATE_DIM_ENTRY,
        DELETE_DIM_ENTRY,
        RESOLVE_WORKER_REFERENCE,
    )
}


def get_tool_manifests(
    channel: ToolChannel = ToolChannel.COPILOT,
) -> list[dict[str, Any]]:
    """Return the LiteLLM ``tools`` manifest for tools visible on ``channel``."""
    return [
        spec.manifest for spec in TOOL_REGISTRY.values() if channel in spec.channels
    ]
