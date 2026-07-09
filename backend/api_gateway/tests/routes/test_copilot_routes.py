"""Validation tests for the copilot chat request DTOs.

These are pure-Pydantic tests — they never touch the app, DB or Cerbos, so no
session containers are started.
"""

import pytest
from pydantic import ValidationError

from src.routes.copilot_routes import AgentChatInbound, ChatMessage


class TestChatMessage:
    def test_accepts_user_and_assistant_roles(self):
        assert ChatMessage(role="user", content="hi").role == "user"
        assert ChatMessage(role="assistant", content="hey").role == "assistant"

    @pytest.mark.parametrize("bad_role", ["system", "tool", "developer", ""])
    def test_rejects_non_conversational_roles(self, bad_role):
        with pytest.raises(ValidationError):
            ChatMessage(role=bad_role, content="hi")

    def test_rejects_oversized_content(self):
        with pytest.raises(ValidationError):
            ChatMessage(role="user", content="x" * 8001)


class TestAgentChatInbound:
    def test_minimal_payload_defaults(self):
        payload = AgentChatInbound(message="hello")
        assert payload.history == []
        assert payload.team_id is None
        assert payload.schedule_id is None

    def test_full_payload(self):
        payload = AgentChatInbound(
            message="and their hours?",
            history=[
                ChatMessage(role="user", content="who is on the team?"),
                ChatMessage(role="assistant", content="Alice and Bob."),
            ],
            team_id="team-9",
            schedule_id="sched-3",
        )
        assert len(payload.history) == 2
        assert payload.team_id == "team-9"

    def test_rejects_oversized_message(self):
        with pytest.raises(ValidationError):
            AgentChatInbound(message="x" * 8001)

    def test_rejects_too_much_history(self):
        with pytest.raises(ValidationError):
            AgentChatInbound(
                message="hi",
                history=[ChatMessage(role="user", content="x") for _ in range(21)],
            )
