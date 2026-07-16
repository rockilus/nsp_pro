import logging

from fastmcp import Context
from mcp.types import ToolAnnotations
from shared.database.database_collections import DatabaseCollections

from src.mcp_server.models import DimensionValue, WeeklySlotPreference, WorkerRosterItem
from src.mcp_server.server import mcp

logger = logging.getLogger(__name__)


def _build_team_members(
    db: DatabaseCollections, team_id: str
) -> list[WorkerRosterItem]:
    workers = db.worker_db.get_workers_not_deleted(team_id)
    if not workers:
        return []

    specialties = {
        s.id: s.name
        for s in db.specialty_db.get_specialties_not_deleted_by_team_id(team_id)
    }

    worker_ids = [w.id for w in workers]
    attributes = db.attribute_db.get_attributes_by_owner_ids(worker_ids)

    attr_by_worker: dict[str, list] = {w.id: [] for w in workers}
    for attr in attributes:
        attr_by_worker.setdefault(attr.owner_id, []).append(attr)

    unique_dim_ids = {a.dimension_id for a in attributes}
    dimensions_map = {
        d.id: d for d in db.dimension_db.get_dimensions_not_deleted(team_id)
    }
    relevant_dim_ids = [did for did in unique_dim_ids if did in dimensions_map]
    dim_entries_map: dict[str, str] = {}
    if relevant_dim_ids:
        dim_entries = db.dim_entry_db.get_dim_entries_by_dim_ids(relevant_dim_ids)
        dim_entries_map = {de.id: de.name for de in dim_entries}

    result: list[WorkerRosterItem] = []
    for w in workers:
        worker_attrs = attr_by_worker.get(w.id, [])

        dimensions: list[DimensionValue] = []
        for attr in worker_attrs:
            dim = dimensions_map.get(attr.dimension_id)
            if dim is None:
                continue
            entry_ids: list[str] = []
            entry_names: list[str] = []
            raw_value: str | int | float | bool | None = None

            if dim.entry_type.value == 3:  # DIM_ENTRIES
                entry_ids = list(attr.dim_entry_ids)
                entry_names = [
                    dim_entries_map.get(eid, eid) for eid in attr.dim_entry_ids
                ]
            else:
                raw_value = attr.value

            dimensions.append(
                DimensionValue(
                    dimension_id=dim.id,
                    dimension_name=dim.name,
                    entry_ids=entry_ids,
                    entry_names=entry_names,
                    raw_value=raw_value,
                )
            )

        prefs: list[WeeklySlotPreference] | None = None
        if w.weekly_preferences is not None and w.weekly_preferences.enabled:
            prefs = [
                WeeklySlotPreference(
                    day_of_week=slot.day_of_week,
                    slot=slot.slot,
                    restriction=slot.restriction.value,
                )
                for slot in w.weekly_preferences.slots
            ]

        result.append(
            WorkerRosterItem(
                id=w.id,
                name=w.name,
                acronym=w.acronym,
                employment_start_date=w.employment_start_date.isoformat(),
                employment_end_date=(
                    w.employment_end_date.isoformat() if w.employment_end_date else None
                ),
                weekly_hours=w.weekly_hours,
                weekly_hours_desired=w.weekly_hours_desired,
                duties_per_month=w.duties_per_month,
                annual_leave=w.annual_leave,
                has_user_account=w.user_id is not None,
                specialties=[specialties.get(sid, sid) for sid in w.specialty_ids],
                dimensions=dimensions,
                weekly_preferences=prefs,
            )
        )

    return result


@mcp.tool(
    annotations=ToolAnnotations(
        readOnlyHint=True,
        destructiveHint=False,
        idempotentHint=True,
        openWorldHint=True,
    ),
)
async def get_team_members(team_id: str, ctx: Context) -> list[WorkerRosterItem]:
    """Return every active team member with their full scheduling profile,
    specialties, and custom dimensions. This is the primary lookup for any
    question about workers — who they are, what they do, when they joined,
    what specialties they hold, and what custom attributes (dimensions)
    they have.

    Use this tool when the prompt asks about:
    - Worker identity: names, acronyms, whether they have a user account
    - Specialties: "who has the Pediatry specialty?", "list cardiologists"
    - Employment dates: "who joined last month?", "who is leaving soon?"
    - Contract details: contract hours, desired hours, duties per month,
      annual leave allowance
    - Custom dimensions: "who works in Paris?" (Location dimension),
      "who is a Senior?" (Seniority dimension), any dimension defined
      by the team
    - Weekly availability: "who is available Monday mornings?",
      "who has no restrictions on Tuesday night?"

    The response includes every field needed to answer these questions.
    Filtering by name, date range, specialty, or dimension value is done
    by reading the response — no additional tool calls are needed.

    Response fields per member:
    - id, name, acronym: identity fields
    - employment_start_date, employment_end_date: ISO date strings
      (YYYY-MM-DD format), null end_date means currently active
    - weekly_hours, weekly_hours_desired, duties_per_month, annual_leave:
      contract and workload targets (all integers)
    - has_user_account: boolean whether linked to a Rockilus login
    - specialties: list of human-readable specialty names (strings)
    - dimensions: list of DimensionValue objects, each containing:
        dimension_id, dimension_name (e.g. "Location"),
        entry_ids (raw IDs), entry_names (e.g. ["Paris"]),
        raw_value (for free-text/boolean/numeric dimensions, null for
        dropdown dimensions)
    - weekly_preferences: list of availability restrictions, or null if
      none are configured. Each slot has day_of_week (0=Monday...6=Sunday),
      slot (morning/afternoon/night), and restriction (no_work/no_normal/
      no_duty/no_specific)
    """
    logger.info("MCP tool: get_team_members team=%s", team_id)

    from src.mcp_server.context import build_mcp_context
    from src.mcp_server.tools.registry import GET_TEAM_MEMBERS

    mcp_ctx = await build_mcp_context(ctx)
    return await GET_TEAM_MEMBERS.executor(
        db=mcp_ctx.db,
        user_context=mcp_ctx.user_context,
        cerbos=mcp_ctx.cerbos,
        team_id=team_id,
    )
