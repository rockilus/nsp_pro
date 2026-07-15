"""Copilot write executors for worker CRUD and worker dimension values.

Each executor runs in one of two modes:

  - ``"preview"`` (Tier 2 update / Tier 1 delete): validate + authorize, then
    return a ``pending_confirmation`` payload describing the proposed change.
    NOTHING is mutated. The agent loop mints a signed action token from this.
  - ``"execute"``: perform the real mutation via the shared service layer.
    Only reached from ``POST /copilot/actions/confirm`` after the signed token
    and its argument hash have been verified.

Tier 3 creates are non-destructive and always execute immediately.

Authorization is always evaluated against the caller's real
``user_context.user_id`` at the ``team`` level, matching every existing worker
route (``check(user_id, action, "team", team_id)``).
"""

import logging
from typing import Any

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    DimensionEntryType,
    Worker,
)

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.schemas.worker_arguments import (
    CreateWorkerArgs,
    DeleteWorkerArgs,
    SetWorkerDimensionValueArgs,
    UpdateWorkerArgs,
)
from src.security.user_context import UserContext
from src.services.worker_service import WorkerService
from src.utils.string_utils import generate_acronym

logger = logging.getLogger(__name__)


def _denied(action: str) -> dict[str, Any]:
    return {
        "status": "error",
        "message": f"You are not authorized to {action}.",
    }


async def execute_create_worker(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "execute",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 3 (instant): create a new worker."""
    args = CreateWorkerArgs(**kwargs)
    if not await cerbos.check(
        user_context.user_id, "create-worker", "team", args.team_id
    ):
        return _denied("create a worker")

    existing = db.worker_db.get_workers_not_deleted(args.team_id)
    acronym = generate_acronym(args.name, [w.acronym for w in existing])

    worker = Worker(
        id="",
        team_id=args.team_id,
        name=args.name,
        acronym=acronym,
        acronym_custom=False,
        employment_start_date=args.employment_start_date,
        employment_end_date=None,
        weekly_hours=args.weekly_hours,
        weekly_hours_desired=args.weekly_hours_desired,
        duties_per_month=args.duties_per_month,
        annual_leave=args.annual_leave,
        specialty_ids=args.specialty_ids,
        deleted=False,
    )
    logger.info("Copilot creating worker name=%s team=%s", args.name, args.team_id)
    created, _ = WorkerService(db).create_worker(worker)
    return {
        "status": "success",
        "worker_id": created.id,
        "message": f"Worker '{created.name}' created successfully.",
    }


async def execute_update_worker(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 2 (preview/execute): patch selected fields of a worker."""
    args = UpdateWorkerArgs(**kwargs)
    existing = db.worker_db.get_worker_by_id(args.worker_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Worker with ID {args.worker_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "update-worker", "team", existing.team_id
    ):
        return _denied("update this worker")

    _FIELDS = {
        "name": "Name",
        "weekly_hours": "Contract weekly hours",
        "weekly_hours_desired": "Desired weekly hours",
        "duties_per_month": "Duties per month",
        "annual_leave": "Annual leave (days)",
        "employment_start_date": "Employment start date",
        "employment_end_date": "Employment end date",
    }
    patch = args.model_dump(exclude_none=True, exclude={"worker_id"})

    # Validate the effective employment window (patched value falls back to the
    # stored one) so a partial update cannot produce start > end.
    effective_start = patch.get("employment_start_date", existing.employment_start_date)
    effective_end = patch.get("employment_end_date", existing.employment_end_date)
    if effective_end is not None and effective_start > effective_end:
        return {
            "status": "error",
            "message": "Employment start date cannot be after employment end date.",
        }

    if mode == "preview":
        changes = []
        for field, label in _FIELDS.items():
            if field not in patch:
                continue
            old = getattr(existing, field)
            new = patch[field]
            old_repr = old.isoformat() if hasattr(old, "isoformat") else old
            new_repr = new.isoformat() if hasattr(new, "isoformat") else new
            if old_repr == new_repr:
                continue
            changes.append(
                {"field": field, "label": label, "old": old_repr, "new": new_repr}
            )
        if "specialty_ids" in patch:
            changes.append(
                {
                    "field": "specialty_ids",
                    "label": "Specialties",
                    "old": existing.specialty_ids,
                    "new": patch["specialty_ids"],
                }
            )
        return {
            "status": "pending_confirmation",
            "tier": "update",
            "preview": {
                "entity": "worker",
                "entity_id": existing.id,
                "entity_name": existing.name,
                "changes": changes,
            },
        }

    # execute: merge patch onto existing to preserve unspecified fields
    for field, value in patch.items():
        setattr(existing, field, value)
    logger.info("Copilot updating worker id=%s fields=%s", existing.id, list(patch))
    updated = WorkerService(db).update_worker(existing)
    return {
        "status": "success",
        "worker_id": updated.id,
        "message": f"Worker '{updated.name}' updated successfully.",
    }


async def execute_delete_worker(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 1 (preview/execute): soft-delete a worker."""
    args = DeleteWorkerArgs(**kwargs)
    existing = db.worker_db.get_worker_by_id(args.worker_id)
    if existing is None:
        return {
            "status": "error",
            "message": f"Worker with ID {args.worker_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "delete-worker", "team", existing.team_id
    ):
        return _denied("delete this worker")

    if mode == "preview":
        return {
            "status": "pending_confirmation",
            "tier": "delete",
            "preview": {
                "entity": "worker",
                "entity_id": existing.id,
                "entity_name": existing.name,
            },
        }

    logger.info("Copilot soft-deleting worker id=%s", existing.id)
    WorkerService(db).delete_worker(existing.id)
    return {
        "status": "success",
        "worker_id": existing.id,
        "message": f"Worker '{existing.name}' was removed (soft-deleted).",
    }


async def execute_set_worker_dimension_value(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    mode: str = "preview",
    **kwargs: Any,
) -> dict[str, Any]:
    """Tier 2 (preview/execute): set a worker's value for one dimension."""
    args = SetWorkerDimensionValueArgs(**kwargs)
    worker = db.worker_db.get_worker_by_id(args.worker_id)
    if worker is None:
        return {
            "status": "error",
            "message": f"Worker with ID {args.worker_id} does not exist.",
        }
    dimension = db.dimension_db.get_dimension_by_id(args.dimension_id)
    if dimension is None:
        return {
            "status": "error",
            "message": f"Dimension with ID {args.dimension_id} does not exist.",
        }
    if not await cerbos.check(
        user_context.user_id, "update-attribute", "team", worker.team_id
    ):
        return _denied("update this worker's dimension value")

    is_dropdown = dimension.entry_type == DimensionEntryType.DIM_ENTRIES
    existing_attr = next(
        (
            a
            for a in db.attribute_db.get_attributes_by_owner_id(worker.id)
            if a.dimension_id == dimension.id
        ),
        None,
    )

    if is_dropdown:
        entry_ids = args.dim_entry_ids or []
        entry_names = [
            de.name
            for de in db.dim_entry_db.get_dim_entries_by_dim_id(dimension.id)
            if de.id in entry_ids
        ]
        new_repr: Any = entry_names
    else:
        new_repr = args.value

    if mode == "preview":
        if existing_attr is None:
            old_repr: Any = None
        elif is_dropdown:
            names_map = {
                de.id: de.name
                for de in db.dim_entry_db.get_dim_entries_by_dim_id(dimension.id)
            }
            old_repr = [names_map.get(e, e) for e in existing_attr.dim_entry_ids]
        else:
            old_repr = existing_attr.value
        return {
            "status": "pending_confirmation",
            "tier": "update",
            "preview": {
                "entity": "worker",
                "entity_id": worker.id,
                "entity_name": worker.name,
                "changes": [
                    {
                        "field": "dimension",
                        "label": dimension.name,
                        "old": old_repr,
                        "new": new_repr,
                    }
                ],
            },
        }

    attribute = Attribute(
        id=existing_attr.id if existing_attr else "",
        value=(existing_attr.value if existing_attr else "")
        if is_dropdown
        else (args.value if args.value is not None else ""),
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker.id,
        dimension_id=dimension.id,
        dim_entry_ids=(args.dim_entry_ids or []) if is_dropdown else [],
    )
    logger.info("Copilot setting dimension=%s for worker=%s", dimension.id, worker.id)
    from src.services.attribute_service import AttributeService

    AttributeService(db).create_or_update_attribute(attribute)
    return {
        "status": "success",
        "worker_id": worker.id,
        "message": (
            f"Dimension '{dimension.name}' updated for worker '{worker.name}'."
        ),
    }
