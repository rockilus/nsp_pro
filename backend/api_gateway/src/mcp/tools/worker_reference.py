"""Granular worker name-to-ID resolution for the Plan-and-Execute pipeline.

Returns a flat dict suitable for direct ``$VARIABLE`` binding without
the Planner needing to write a list-filter DSL expression.
"""

from typing import Any

from pydantic import ValidationError
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error, log_info

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.schemas.worker_reference_args import ResolveWorkerReferenceArgs
from src.mcp.tools.workers import _build_team_members
from src.security.user_context import UserContext


async def execute_resolve_worker_reference(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    **kwargs: Any,
) -> dict[str, Any]:
    try:
        args = ResolveWorkerReferenceArgs(**kwargs)
    except ValidationError as exc:
        log_error(f"resolve_worker_reference validation failed: {exc}")
        return {
            "status": "error",
            "message": f"Invalid arguments: {exc}",
        }

    if not await cerbos.check(
        user_context.user_id, "read-workers", "team", args.team_id
    ):
        return {
            "status": "error",
            "message": "You do not have permission to view workers on this team.",
        }

    workers = _build_team_members(db, args.team_id)
    lookup = args.name.strip().lower()

    exact_matches = [w for w in workers if w.name.strip().lower() == lookup]
    if len(exact_matches) == 1:
        w = exact_matches[0]
        log_info(f"resolve_worker_reference exact match: {w.name} → {w.id}")
        return {
            "status": "success",
            "worker_id": w.id,
            "name": w.name,
            "acronym": w.acronym,
        }

    substring_matches = [w for w in workers if lookup in w.name.strip().lower()]
    if len(substring_matches) == 1:
        w = substring_matches[0]
        log_info(f"resolve_worker_reference substring match: {w.name} → {w.id}")
        return {
            "status": "success",
            "worker_id": w.id,
            "name": w.name,
            "acronym": w.acronym,
        }

    if len(substring_matches) > 1:
        candidates = [
            {"name": w.name, "acronym": w.acronym, "worker_id": w.id}
            for w in substring_matches
        ]
        log_info(
            f"resolve_worker_reference ambiguous: {lookup!r} matched "
            f"{len(candidates)} workers"
        )
        return {
            "status": "error",
            "message": (
                f"Multiple workers match '{args.name}'. "
                "Please ask the user which one they mean: "
                + ", ".join(c["name"] for c in candidates)
            ),
            "candidates": candidates,
        }

    return {
        "status": "error",
        "message": (
            f"No worker found matching '{args.name}'. "
            "Check the spelling or ask the user to clarify."
        ),
    }
