"""Copilot executors for dimension / dim-entry CRUD and dimension reads.

See ``worker_writes`` for the two-mode (preview/execute) convention. All
authorization is at the ``team`` level using the caller's real user id.
"""

import logging
from typing import Any

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
)

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp_server.schemas.dimension_arguments import (
    CreateDimensionArgs,
    CreateDimEntryArgs,
    DeleteDimensionArgs,
    DeleteDimEntryArgs,
    UpdateDimensionArgs,
    UpdateDimEntryArgs,
)
from src.security.user_context import UserContext
from src.services.dim_entry_service import DimEntryService
from src.services.dimension_service import DimensionService

logger = logging.getLogger(__name__)


def _denied(action: str) -> dict[str, Any]:
    return {
        "status": "error",
        "message": f"You are not authorized to {action}.",
    }


async def execute_get_dimensions(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    team_id: str,
) -> dict[str, Any]:
    """Read tool: list a team's dimensions and their dropdown entries.

    Needed to resolve dropdown option names to entry IDs before calling
    ``set_worker_dimension_value``.
    """
    if not await cerbos.check(user_context.user_id, "read-dimensions", "team", team_id):
        return {"status": "error", "message": "Not authorized.", "dimensions": []}

    dimensions = db.dimension_db.get_dimensions_not_deleted(team_id)
    dim_ids = [d.id for d in dimensions]
    entries_by_dim: dict[str, list] = {d.id: [] for d in dimensions}
    if dim_ids:
        for de in db.dim_entry_db.get_dim_entries_by_dim_ids(dim_ids):
            entries_by_dim.setdefault(de.dimension_id, []).append(de)

    result = []
    for d in dimensions:
        result.append(
            {
                "dimension_id": d.id,
                "name": d.name,
                "entry_type": d.entry_type.value,
                "dim_types": [t.value for t in d.dim_types],
                "entries": [
                    {"dim_entry_id": de.id, "name": de.name}
                    for de in entries_by_dim.get(d.id, [])
                ],
            }
        )
    return {"status": "success", "dimensions": result}


async def execute_create_dimension(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "execute",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 3 (instant): create a worker dimension (+ dropdown entries)."""
    args = CreateDimensionArgs(**kwargs)
    if not await cerbos.check(
        user_context.user_id, "create-dimension", "team", args.team_id
    ):
        return _denied("create a dimension")

    try:
        entry_type = DimensionEntryType(args.entry_type)
    except ValueError:
        return {
            "status": "error",
            "message": "Invalid entry_type. Use 0=text, 1=number, 2=yes/no, "
            "3=dropdown.",
        }

    dimension = Dimension(
        id="",
        team_id=args.team_id,
        dim_types=[DimensionType.WORKER],
        name=args.name,
        entry_type=entry_type,
        deleted=False,
    )
    dim_entries = []
    if entry_type == DimensionEntryType.DIM_ENTRIES:
        dim_entries = [
            DimEntry(id="", dimension_id="", name=name, deleted=False)
            for name in args.entry_names
        ]
    logger.info("Copilot creating dimension name=%s team=%s", args.name, args.team_id)
    new_dim = DimensionService(db).create_dimension(dimension, dim_entries)
    return {
        "status": "success",
        "dimension_id": new_dim.new_dimension.id,
        "message": f"Dimension '{new_dim.new_dimension.name}' created successfully.",
    }


async def execute_update_dimension(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 2 (preview/execute): rename a dimension."""
    args = UpdateDimensionArgs(**kwargs)
    existing = db.dimension_db.get_dimension_by_id(args.dimension_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Dimension with ID {args.dimension_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "update-dimension", "team", existing.team_id
    ):
        return _denied("update this dimension")

    if args.name is None or args.name == existing.name:
        return {
            "status": "error",
            "message": "No changes provided for the dimension.",
        }

    if mode == "preview":
        return {
            "status": "pending_confirmation",
            "tier": "update",
            "preview": {
                "entity": "dimension",
                "entity_id": existing.id,
                "entity_name": existing.name,
                "changes": [
                    {
                        "field": "name",
                        "label": "Name",
                        "old": existing.name,
                        "new": args.name,
                    }
                ],
            },
        }

    existing.name = args.name
    logger.info("Copilot updating dimension id=%s", existing.id)
    updated = DimensionService(db).update_dimension(existing)
    return {
        "status": "success",
        "dimension_id": updated.id,
        "message": f"Dimension renamed to '{updated.name}'.",
    }


async def execute_delete_dimension(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 1 (preview/execute): soft-delete a dimension."""
    args = DeleteDimensionArgs(**kwargs)
    existing = db.dimension_db.get_dimension_by_id(args.dimension_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Dimension with ID {args.dimension_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "delete-dimension", "team", existing.team_id
    ):
        return _denied("delete this dimension")

    if mode == "preview":
        return {
            "status": "pending_confirmation",
            "tier": "delete",
            "preview": {
                "entity": "dimension",
                "entity_id": existing.id,
                "entity_name": existing.name,
            },
        }

    logger.info("Copilot soft-deleting dimension id=%s", existing.id)
    DimensionService(db).delete_dimension(existing.id)
    return {
        "status": "success",
        "dimension_id": existing.id,
        "message": f"Dimension '{existing.name}' was removed (soft-deleted).",
    }


async def execute_create_dim_entry(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "execute",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 3 (instant): add a dropdown option to a dimension."""
    args = CreateDimEntryArgs(**kwargs)
    dimension = db.dimension_db.get_dimension_by_id(args.dimension_id)
    if dimension is None:
        return {
            "status": "error",
            "message": f"Dimension with ID {args.dimension_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "create-dim-entry", "team", dimension.team_id
    ):
        return _denied("create a dimension option")

    dim_entry = DimEntry(
        id="", dimension_id=args.dimension_id, name=args.name, deleted=False
    )
    logger.info("Copilot creating dim entry for dimension=%s", args.dimension_id)
    created = DimEntryService(db).create_dim_entry(dim_entry)
    return {
        "status": "success",
        "dim_entry_id": created.id,
        "message": f"Option '{created.name}' added to '{dimension.name}'.",
    }


async def execute_update_dim_entry(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 2 (preview/execute): rename a dropdown option."""
    args = UpdateDimEntryArgs(**kwargs)
    existing = db.dim_entry_db.get_dim_entry_by_id(args.dim_entry_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Dimension option with ID {args.dim_entry_id} does not exist.",
        }
    dimension = db.dimension_db.get_dimension_by_id(existing.dimension_id)
    if dimension is None:
        return {"status": "error", "message": "Parent dimension does not exist."}
    if not await cerbos.check(
        user_context.user_id, "update-dim-entry", "team", dimension.team_id
    ):
        return _denied("update this dimension option")

    if args.name is None or args.name == existing.name:
        return {"status": "error", "message": "No changes provided."}

    if mode == "preview":
        return {
            "status": "pending_confirmation",
            "tier": "update",
            "preview": {
                "entity": "dim_entry",
                "entity_id": existing.id,
                "entity_name": existing.name,
                "changes": [
                    {
                        "field": "name",
                        "label": "Name",
                        "old": existing.name,
                        "new": args.name,
                    }
                ],
            },
        }

    existing.name = args.name
    logger.info("Copilot updating dim entry id=%s", existing.id)
    updated = DimEntryService(db).update_dim_entry(existing)
    return {
        "status": "success",
        "dim_entry_id": updated.id,
        "message": f"Option renamed to '{updated.name}'.",
    }


async def execute_delete_dim_entry(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 1 (preview/execute): soft-delete a dropdown option."""
    args = DeleteDimEntryArgs(**kwargs)
    existing = db.dim_entry_db.get_dim_entry_by_id(args.dim_entry_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Dimension option with ID {args.dim_entry_id} does not exist.",
        }
    dimension = db.dimension_db.get_dimension_by_id(existing.dimension_id)
    if dimension is None:
        return {"status": "error", "message": "Parent dimension does not exist."}
    if not await cerbos.check(
        user_context.user_id, "delete-dim-entry", "team", dimension.team_id
    ):
        return _denied("delete this dimension option")

    if mode == "preview":
        return {
            "status": "pending_confirmation",
            "tier": "delete",
            "preview": {
                "entity": "dim_entry",
                "entity_id": existing.id,
                "entity_name": existing.name,
            },
        }

    logger.info("Copilot soft-deleting dim entry id=%s", existing.id)
    DimEntryService(db).delete_dim_entry(existing.id)
    return {
        "status": "success",
        "dim_entry_id": existing.id,
        "message": f"Option '{existing.name}' was removed.",
    }
