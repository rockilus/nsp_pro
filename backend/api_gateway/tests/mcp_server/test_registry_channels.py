"""Tests for tool registry channel visibility."""

from src.mcp_server.tools.registry import (
    TOOL_REGISTRY,
    ToolChannel,
    get_tool_manifests,
)

_WRITE_TOOLS = {
    "create_worker",
    "update_worker_fields",
    "soft_delete_worker",
    "set_worker_dimension_value",
    "create_dimension",
    "update_dimension",
    "soft_delete_dimension",
    "create_dim_entry",
    "update_dim_entry",
    "delete_dim_entry",
}


def _names(channel: ToolChannel) -> set[str]:
    return {m["function"]["name"] for m in get_tool_manifests(channel)}


class TestChannelVisibility:
    def test_mcp_exposes_only_read_tools(self):
        mcp_names = _names(ToolChannel.MCP)
        assert mcp_names == {"get_team_members", "get_dimensions"}
        assert not (_WRITE_TOOLS & mcp_names)

    def test_copilot_exposes_writes_and_reads(self):
        copilot_names = _names(ToolChannel.COPILOT)
        assert _WRITE_TOOLS <= copilot_names
        assert "get_team_members" in copilot_names

    def test_write_tools_have_confirmation_tiers(self):
        create = {"create_worker", "create_dimension", "create_dim_entry"}
        for name, spec in TOOL_REGISTRY.items():
            if name in create:
                assert spec.confirmation_tier == "none"
            elif name in _WRITE_TOOLS:
                assert spec.confirmation_tier in {"update", "delete"}
