from fastmcp import FastMCP

mcp = FastMCP(
    "Rockilus Scheduler",
    instructions=(
        "Workforce management tools for healthcare scheduling. "
        "Read-only queries for worker rosters, shift coverage gaps, "
        "fatigue compliance audits, and schedule statistics."
    ),
)

from src.mcp.tools.compliance import (  # noqa: E402, F401
    get_breach_summary,
    get_schedule_stats,
)
from src.mcp.tools.scheduling import (  # noqa: E402, F401
    get_coverage_gaps,
    get_team_roster,
    get_unassigned_dates,
    get_worker_schedule,
)
