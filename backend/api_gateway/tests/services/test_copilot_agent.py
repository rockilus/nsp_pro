"""Tests for the copilot agent orchestration loop."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.errors.copilot_errors.copilot_errors import CopilotDisabledError
from src.mcp.models import WorkerRosterItem
from src.security.user_context import UserContext
from src.services.copilot_agent import (
    CopilotAgentService,
    _resolve_api_key,
    _serialize_tool_output,
)

MODULE = "src.services.copilot_agent"


def _user() -> UserContext:
    return UserContext(user_id="admin-1", email="a@b.com", groups=["user"])


def _make_message(content=None, tool_calls=None):
    """A stand-in for a LiteLLM message supporting attr access + model_dump."""
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = tool_calls
    msg.model_dump.return_value = {
        "role": "assistant",
        "content": content,
        "tool_calls": tool_calls,
    }
    return msg


def _make_completion(message):
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def _make_tool_call(call_id, name, arguments):
    return SimpleNamespace(
        id=call_id,
        function=SimpleNamespace(name=name, arguments=arguments),
    )


def _roster_item(name="Alice") -> WorkerRosterItem:
    return WorkerRosterItem(
        id="w1",
        name=name,
        acronym="ALI",
        employment_start_date="2025-01-15",
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=35,
        duties_per_month=4,
        annual_leave=25,
        has_user_account=True,
        specialties=["Pediatry"],
        dimensions=[],
        weekly_preferences=None,
    )


class TestResolveApiKey:
    def test_gemini_prefix(self):
        with patch(f"{MODULE}.config") as cfg:
            cfg.gemini_api_key = "g-key"
            assert _resolve_api_key("gemini/gemini-2.5-flash") == "g-key"

    def test_openrouter_prefix(self):
        with patch(f"{MODULE}.config") as cfg:
            cfg.openrouter_api_key = "or-key"
            assert _resolve_api_key("openrouter/anthropic/claude") == "or-key"

    def test_mistral_prefix(self):
        with patch(f"{MODULE}.config") as cfg:
            cfg.mistral_api_key = "m-key"
            assert _resolve_api_key("mistral/mistral-small-latest") == "m-key"

    def test_unknown_prefix_returns_none(self):
        assert _resolve_api_key("ollama/llama3") is None


class TestSerializeToolOutput:
    def test_list_of_pydantic_models_roundtrips(self):
        content = _serialize_tool_output([_roster_item("Alice")])
        assert isinstance(content, str)
        parsed = json.loads(content)
        assert parsed[0]["name"] == "Alice"

    def test_dict_output(self):
        content = _serialize_tool_output({"error": "nope"})
        assert json.loads(content) == {"error": "nope"}


class TestRunAgentLoop:
    async def test_disabled_raises(self):
        with patch(f"{MODULE}.config") as cfg:
            cfg.ai_enabled = False
            with pytest.raises(CopilotDisabledError):
                await CopilotAgentService.run_agent_loop(
                    user_message="hi",
                    user_context=_user(),
                    db=MagicMock(),
                    cerbos=AsyncMock(),
                )

    async def test_no_tool_call_returns_text(self):
        message = _make_message(content="Bonjour, comment puis-je aider ?")
        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            mock_ac.return_value = _make_completion(message)

            result = await CopilotAgentService.run_agent_loop(
                user_message="salut",
                user_context=_user(),
                db=MagicMock(),
                cerbos=AsyncMock(),
            )

        assert result.text == "Bonjour, comment puis-je aider ?"
        # api_key passed per-call, never via env
        _, kwargs = mock_ac.call_args
        assert kwargs["api_key"] == "g-key"

    async def test_tool_call_executes_and_feeds_result_back(self):
        tool_call = _make_tool_call(
            "call-1", "get_team_members", json.dumps({"team_id": "team-9"})
        )
        first = _make_completion(_make_message(tool_calls=[tool_call]))
        second = _make_completion(_make_message(content="Voici l'équipe : Alice."))

        cerbos = AsyncMock()
        cerbos.check.return_value = True

        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
            patch(
                "src.mcp.tools.registry._build_team_members",
                return_value=[_roster_item("Alice")],
            ) as mock_build,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            mock_ac.side_effect = [first, second]

            result = await CopilotAgentService.run_agent_loop(
                user_message="qui est dans team-9 ?",
                user_context=_user(),
                db=MagicMock(),
                cerbos=cerbos,
            )

        assert result.text == "Voici l'équipe : Alice."
        cerbos.check.assert_awaited_once_with(
            "admin-1", "read-workers", "team", "team-9"
        )
        mock_build.assert_called_once()

        # Second call includes a tool message with serialized JSON content
        second_messages = mock_ac.call_args_list[1].kwargs["messages"]
        tool_msg = next(m for m in second_messages if m.get("role") == "tool")
        assert isinstance(tool_msg["content"], str)
        assert json.loads(tool_msg["content"])[0]["name"] == "Alice"

    async def test_authz_denied_returns_empty_no_data_leak(self):
        tool_call = _make_tool_call(
            "call-1", "get_team_members", json.dumps({"team_id": "team-x"})
        )
        first = _make_completion(_make_message(tool_calls=[tool_call]))
        second = _make_completion(_make_message(content="No access."))

        cerbos = AsyncMock()
        cerbos.check.return_value = False

        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
            patch(
                "src.mcp.tools.registry._build_team_members",
                return_value=[_roster_item("Secret")],
            ) as mock_build,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            mock_ac.side_effect = [first, second]

            await CopilotAgentService.run_agent_loop(
                user_message="show me team-x",
                user_context=_user(),
                db=MagicMock(),
                cerbos=cerbos,
            )

        # Business logic never runs when authz denies
        mock_build.assert_not_called()
        second_messages = mock_ac.call_args_list[1].kwargs["messages"]
        tool_msg = next(m for m in second_messages if m.get("role") == "tool")
        assert json.loads(tool_msg["content"]) == []

    async def test_invalid_tool_args_surface_as_structured_error(self):
        tool_call = _make_tool_call(
            "call-1", "update_worker_fields", json.dumps({"bogus": "x"})
        )
        first = _make_completion(_make_message(tool_calls=[tool_call]))
        second = _make_completion(_make_message(content="I could not apply that."))

        cerbos = AsyncMock()
        cerbos.check.return_value = True

        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            cfg.copilot_action_jwt_secret = "s" * 32
            cfg.copilot_action_token_ttl_seconds = 300
            mock_ac.side_effect = [first, second]

            result = await CopilotAgentService.run_agent_loop(
                user_message="update worker with a bad field",
                user_context=_user(),
                db=MagicMock(),
                cerbos=cerbos,
            )

        assert result.pending_action is None
        second_messages = mock_ac.call_args_list[1].kwargs["messages"]
        tool_msg = next(m for m in second_messages if m.get("role") == "tool")
        payload = json.loads(tool_msg["content"])
        assert payload["error"] == "Invalid tool arguments provided."

    async def test_history_is_prepended_before_current_message(self):
        message = _make_message(content="Sure, following up.")
        history = [
            {"role": "user", "content": "who is on team-9?"},
            {"role": "assistant", "content": "Alice and Bob."},
        ]
        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            cfg.ai_max_history_messages = 20
            mock_ac.return_value = _make_completion(message)

            await CopilotAgentService.run_agent_loop(
                user_message="and their hours?",
                user_context=_user(),
                db=MagicMock(),
                cerbos=AsyncMock(),
                history=history,
            )

        sent = mock_ac.call_args.kwargs["messages"]
        # system, history[0], history[1], context (date anchor), current message
        assert sent[0]["role"] == "system"
        assert sent[1] == {"role": "user", "content": "who is on team-9?"}
        assert sent[2] == {"role": "assistant", "content": "Alice and Bob."}
        assert sent[-1]["role"] == "user"
        assert sent[-1]["content"].endswith(
            "<raw_user_message>and their hours?</raw_user_message>"
        )

    async def test_context_message_injected_from_active_screen(self):
        message = _make_message(content="ok")
        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            mock_ac.return_value = _make_completion(message)

            await CopilotAgentService.run_agent_loop(
                user_message="analyze this",
                user_context=_user(),
                db=MagicMock(),
                cerbos=AsyncMock(),
                team_id="team-9",
                schedule_id="sched-3",
            )

        sent = mock_ac.call_args.kwargs["messages"]
        context = next(
            m
            for m in sent
            if m["role"] == "system" and "team_id=team-9" in m["content"]
        )
        assert "schedule_id=sched-3" in context["content"]

    async def test_temporal_anchor_always_injected(self):
        message = _make_message(content="ok")
        with (
            patch(f"{MODULE}.config") as cfg,
            patch(f"{MODULE}.acompletion", new=AsyncMock()) as mock_ac,
        ):
            cfg.ai_enabled = True
            cfg.ai_model = "gemini/gemini-2.5-flash"
            cfg.gemini_api_key = "g-key"
            mock_ac.return_value = _make_completion(message)

            await CopilotAgentService.run_agent_loop(
                user_message="hello",
                user_context=_user(),
                db=MagicMock(),
                cerbos=AsyncMock(),
            )

        sent = mock_ac.call_args.kwargs["messages"]
        # Even with no team/schedule ids, the UTC date anchor is present.
        context = next(
            m for m in sent if m["role"] == "system" and "current_date=" in m["content"]
        )
        assert "timezone=UTC" in context["content"]
        assert "weekday=" in context["content"]


class TestBuildContextMessage:
    def test_renders_fixed_date_deterministically(self):
        from datetime import date

        from src.services.copilot_agent import _build_context_message

        msg = _build_context_message(date(2026, 7, 9), None, None)
        assert "current_date=2026-07-09" in msg["content"]
        assert "weekday=Thursday" in msg["content"]
        assert "timezone=UTC" in msg["content"]

    def test_includes_team_and_schedule_with_date(self):
        from datetime import date

        from src.services.copilot_agent import _build_context_message

        msg = _build_context_message(date(2026, 7, 9), "team-9", "sched-3")
        assert "current_date=2026-07-09" in msg["content"]
        assert "team_id=team-9" in msg["content"]
        assert "schedule_id=sched-3" in msg["content"]
