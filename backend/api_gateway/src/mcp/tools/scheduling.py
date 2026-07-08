import logging
from datetime import date as date_type

from fastmcp import Context

from src.mcp.context import build_mcp_context
from src.mcp.server import mcp

logger = logging.getLogger(__name__)


@mcp.tool()
async def get_team_roster(team_id: str, ctx: Context) -> list[dict]:
    logger.info("MCP tool: get_team_roster team=%s", team_id)

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-workers", "team", team_id
    ):
        return [{"error": "Not authorized to read workers for this team"}]

    workers = mcp_ctx.db.worker_db.get_workers_not_deleted(team_id)
    specialties = {
        s.id: s.name
        for s in mcp_ctx.db.specialty_db.get_specialties_not_deleted_by_team_id(team_id)
    }

    result = []
    for w in workers:
        result.append(
            {
                "id": w.id,
                "name": w.name,
                "acronym": w.acronym,
                "weekly_hours": w.weekly_hours,
                "weekly_hours_desired": w.weekly_hours_desired,
                "duties_per_month": w.duties_per_month,
                "annual_leave": w.annual_leave,
                "employment_start_date": w.employment_start_date.isoformat(),
                "employment_end_date": (
                    w.employment_end_date.isoformat() if w.employment_end_date else None
                ),
                "specialties": [specialties.get(sid, sid) for sid in w.specialty_ids],
                "has_user": w.user_id is not None,
            }
        )
    return result


@mcp.tool()
async def get_worker_schedule(
    team_id: str,
    worker_id: str,
    start_date: str,
    end_date: str,
    ctx: Context,
) -> list[dict]:
    logger.info(
        "MCP tool: get_worker_schedule team=%s worker=%s %s-%s",
        team_id,
        worker_id,
        start_date,
        end_date,
    )

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-assignments-validated", "team", team_id
    ):
        return [{"error": "Not authorized to read assignments for this team"}]

    s_date = date_type.fromisoformat(start_date)
    e_date = date_type.fromisoformat(end_date)

    assignments = mcp_ctx.db.assignment_db.get_assignments_by_dates(
        team_id, s_date, e_date
    )
    shifts_map = {s.id: s for s in mcp_ctx.db.shift_db.get_shifts_not_deleted(team_id)}

    worker_assignments = [a for a in assignments if a.worker_id == worker_id]
    worker_assignments.sort(key=lambda a: a.date)

    result = []
    for a in worker_assignments:
        shift = shifts_map.get(a.shift_id)
        result.append(
            {
                "date": a.date.isoformat(),
                "shift_id": a.shift_id,
                "shift_name": shift.name if shift else a.shift_id,
                "shift_type": shift.shift_type.name if shift else None,
                "fixed": a.fixed,
                "source": a.source.value if a.source else None,
                "schedule_id": a.schedule_id,
                "assignment_id": a.id,
            }
        )
    return result


@mcp.tool()
async def get_unassigned_dates(
    team_id: str,
    schedule_id: str,
    ctx: Context,
) -> list[dict]:
    logger.info(
        "MCP tool: get_unassigned_dates team=%s schedule=%s",
        team_id,
        schedule_id,
    )

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-schedules", "team", team_id
    ):
        return [{"error": "Not authorized to read schedules for this team"}]

    schedule = mcp_ctx.db.schedule_db.get_schedule_by_id(schedule_id)
    if schedule.team_id != team_id:
        return [{"error": "Schedule does not belong to this team"}]

    shifts = {s.id: s for s in mcp_ctx.db.shift_db.get_shifts_not_deleted(team_id)}
    demands = mcp_ctx.db.shift_demand_new_db.get_shift_demands_by_date_range(
        team_id, schedule.start_date, schedule.end_date
    )
    assignments = mcp_ctx.db.assignment_db.get_assignments_by_schedule_id(schedule_id)

    assigned: dict[tuple, int] = {}
    for a in assignments:
        key = (a.date, a.shift_id)
        assigned[key] = assigned.get(key, 0) + 1

    gaps = []
    for demand in demands:
        key = (demand.date, demand.shift_id)
        filled = assigned.get(key, 0)
        missing = demand.count - filled
        if missing > 0:
            shift = shifts.get(demand.shift_id)
            gaps.append(
                {
                    "date": demand.date.isoformat(),
                    "shift_id": demand.shift_id,
                    "shift_name": shift.name if shift else demand.shift_id,
                    "demanded": demand.count,
                    "assigned": filled,
                    "missing": missing,
                }
            )

    gaps.sort(key=lambda g: (g["date"], g["shift_name"]))
    return gaps


@mcp.tool()
async def get_coverage_gaps(
    team_id: str,
    date: str,
    ctx: Context,
) -> list[dict]:
    logger.info("MCP tool: get_coverage_gaps team=%s date=%s", team_id, date)

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-shift-demands", "team", team_id
    ):
        return [{"error": "Not authorized to read shift demands for this team"}]

    d = date_type.fromisoformat(date)
    shifts = {s.id: s for s in mcp_ctx.db.shift_db.get_shifts_not_deleted(team_id)}
    demands = mcp_ctx.db.shift_demand_new_db.get_shift_demands_by_date_range(
        team_id, d, d
    )
    assignments = mcp_ctx.db.assignment_db.get_assignments_by_dates(team_id, d, d)

    assigned: dict[str, int] = {}
    for a in assignments:
        assigned[a.shift_id] = assigned.get(a.shift_id, 0) + 1

    result = []
    for demand in demands:
        filled = assigned.get(demand.shift_id, 0)
        shift = shifts.get(demand.shift_id)
        result.append(
            {
                "shift_id": demand.shift_id,
                "shift_name": shift.name if shift else demand.shift_id,
                "demand_count": demand.count,
                "assigned_count": filled,
                "gap": demand.count - filled,
            }
        )

    result.sort(key=lambda c: (c["gap"], c["shift_name"]))
    return result
