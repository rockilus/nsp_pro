import logging
from collections import defaultdict
from typing import Any

from fastmcp import Context
from shared.schemas.core import (
    HeaderUnitOptions,
    StatsOptions,
    StatsTimeFrameOptions,
    StatsUnitOptions,
)

from src.mcp.context import build_mcp_context
from src.mcp.server import mcp
from src.services.stats_service import StatsService

logger = logging.getLogger(__name__)

_UNIT_MAP = {
    "nb_days_worked": StatsUnitOptions.NB_DAYS_WORKED,
    "time_worked": StatsUnitOptions.TIME_WORKED,
    "nb_shifts_worked": StatsUnitOptions.NB_SHIFTS_WORKED,
    "nb_rest_days": StatsUnitOptions.NB_REST_DAYS,
    "nb_rest_shifts": StatsUnitOptions.NB_REST_SHIFTS,
    "nb_times_shift": StatsUnitOptions.NB_TIMES_SHIFT,
    "nb_times_rest": StatsUnitOptions.NB_TIMES_REST,
}


@mcp.tool()
async def get_schedule_stats(
    team_id: str,
    schedule_id: str,
    stats_unit: str,
    ctx: Context,
) -> list[dict]:
    logger.info(
        "MCP tool: get_schedule_stats team=%s schedule=%s unit=%s",
        team_id,
        schedule_id,
        stats_unit,
    )

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-stats", "team", team_id
    ):
        return [{"error": "Not authorized to read stats for this team"}]

    schedule = mcp_ctx.db.schedule_db.get_schedule_by_id(schedule_id)
    if schedule.team_id != team_id:
        return [{"error": "Schedule does not belong to this team"}]

    unit = _UNIT_MAP.get(stats_unit, StatsUnitOptions.TIME_WORKED)

    stats_opts = StatsOptions(
        time_frame=StatsTimeFrameOptions.CUSTOM,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        stats_unit=unit,
        header_unit=HeaderUnitOptions.ALL,
        selected_shifts=[],
        show_favorites=False,
    )

    service = StatsService(mcp_ctx.db)
    stats = service.build_stats(team_id, stats_opts)

    workers = {
        w.id: w.name for w in mcp_ctx.db.worker_db.get_workers_not_deleted(team_id)
    }

    result: list[dict[str, Any]] = []
    for header in stats.stats_headers:
        values = [
            {
                "worker_id": v.worker_id,
                "worker_name": workers.get(v.worker_id, v.worker_id),
                "value": v.value,
            }
            for v in stats.stats_values
            if v.header_id == header.id
        ]
        values.sort(key=lambda v: str(v["worker_name"]))
        result.append(
            {
                "header": header.value,
                "stats_unit": stats_unit,
                "values": values,
            }
        )

    return result


@mcp.tool()
async def get_breach_summary(
    team_id: str,
    schedule_id: str,
    ctx: Context,
) -> list[dict]:
    logger.info(
        "MCP tool: get_breach_summary team=%s schedule=%s", team_id, schedule_id
    )

    mcp_ctx = await build_mcp_context(ctx)
    if not await mcp_ctx.cerbos.check(
        mcp_ctx.user_context.user_id, "read-breaches", "team", team_id
    ):
        return [{"error": "Not authorized to read breaches for this team"}]

    breaches = mcp_ctx.db.breach_db.get_breaches_by_schedule_id(schedule_id)

    by_category: dict[str, list] = defaultdict(list)
    for b in breaches:
        by_category[b.objective_category.name].append(b)

    workers = {
        w.id: w.name for w in mcp_ctx.db.worker_db.get_workers_not_deleted(team_id)
    }
    shifts = {s.id: s.name for s in mcp_ctx.db.shift_db.get_shifts_not_deleted(team_id)}

    result: list[dict[str, Any]] = []
    for category, cat_breaches in sorted(by_category.items()):
        top_violations: list[dict[str, Any]] = []
        for b in cat_breaches[:3]:
            for var in b.variables[:5]:
                top_violations.append(
                    {
                        "worker_id": var.worker_id,
                        "worker_name": workers.get(var.worker_id, str(var.worker_id)),
                        "date": var.date.isoformat(),
                        "shift_id": var.shift_id,
                        "shift_name": shifts.get(var.shift_id, var.shift_id),
                    }
                )

        result.append(
            {
                "objective_category": category,
                "count": len(cat_breaches),
                "top_violations": top_violations[:10],
            }
        )

    result.sort(key=lambda c: int(c["count"]), reverse=True)
    return result
