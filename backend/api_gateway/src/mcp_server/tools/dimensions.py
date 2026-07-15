"""Read-only MCP tool for listing team dimensions and dropdown entries."""

import logging

from fastmcp import Context
from mcp.types import ToolAnnotations

from src.mcp_server.server import mcp

logger = logging.getLogger(__name__)


@mcp.tool(
    annotations=ToolAnnotations(
        readOnlyHint=True,
        destructiveHint=False,
        idempotentHint=True,
        openWorldHint=True,
    ),
)
async def get_dimensions(team_id: str, ctx: Context) -> dict:
    """List a team's custom worker dimensions and their dropdown entries.

    Returns each dimension's id, name, entry_type (0=text, 1=number, 2=yes/no,
    3=dropdown) and, for dropdown dimensions, the selectable entries with their
    ids. Use this to resolve dimension/option names to ids.
    """
    logger.info("MCP tool: get_dimensions team=%s", team_id)

    from src.mcp_server.context import build_mcp_context
    from src.mcp_server.tools.registry import GET_DIMENSIONS

    mcp_ctx = await build_mcp_context(ctx)
    return await GET_DIMENSIONS.executor(
        db=mcp_ctx.db,
        user_context=mcp_ctx.user_context,
        cerbos=mcp_ctx.cerbos,
        team_id=team_id,
    )
