from fastmcp import FastMCP

mcp = FastMCP(
    "Rockilus Scheduler",
    instructions=(
        "Workforce management tools for healthcare scheduling. "
        "Read-only queries for worker rosters with specialties, "
        "custom dimensions, and availability preferences."
    ),
)

from src.mcp_server.tools.dimensions import get_dimensions  # noqa: E402, F401
from src.mcp_server.tools.workers import get_team_members  # noqa: E402, F401
